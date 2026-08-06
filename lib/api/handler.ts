import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { getSessionFromRequest, UserSessionPayload } from '@/lib/auth/session';
import { db } from '@/lib/db';

export type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

export interface ApiHandlerContext<TInput = any> {
  req: NextRequest;
  params: Record<string, string | string[]>;
  session: UserSessionPayload | null;
  input: TInput;
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
}

export interface ApiHandlerOptions<TInput = any> {
  schema?: ZodSchema<TInput>;
  roles?: UserRole[];
  requireAuth?: boolean;
  handler: (ctx: ApiHandlerContext<TInput>) => Promise<any>;
}

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(statusCode: number, code: string, message: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function createApiHandler<TInput = any>(options: ApiHandlerOptions<TInput>) {
  return async (req: NextRequest, { params }: { params?: Promise<Record<string, string | string[]>> | Record<string, string | string[]> } = {}) => {
    try {
      const resolvedParams = params ? (params instanceof Promise ? await params : params) : {};
      
      // 1. Session check
      const session = await getSessionFromRequest(req);

      if (options.requireAuth !== false && !session) {
        throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
      }

      // 2. Role guard check
      if (options.roles && options.roles.length > 0) {
        if (!session || !options.roles.includes(session.role)) {
          throw new ApiError(403, 'FORBIDDEN', 'Insufficient permissions for this action');
        }
      }

      // 3. Input parsing
      let rawInput: any = {};
      if (options.schema) {
        if (req.method === 'GET' || req.method === 'DELETE') {
          const url = new URL(req.url);
          const searchObj: Record<string, string> = {};
          url.searchParams.forEach((val, key) => {
            searchObj[key] = val;
          });
          rawInput = searchObj;
        } else {
          try {
            rawInput = await req.json();
          } catch {
            rawInput = {};
          }
        }

        const parseResult = options.schema.safeParse(rawInput);
        if (!parseResult.success) {
          throw new ApiError(400, 'INVALID_INPUT', 'Invalid input data', parseResult.error.flatten());
        }
        rawInput = parseResult.data;
      }

      // 4. Transaction execution
      const result = await db.transaction(async (tx) => {
        return await options.handler({
          req,
          params: resolvedParams,
          session,
          input: rawInput,
          tx,
        });
      });

      // 5. Response formatting
      if (result instanceof NextResponse) {
        return result;
      }

      return NextResponse.json(result, { status: 200 });

    } catch (err: any) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          {
            error: {
              code: err.code,
              message: err.message,
              ...(err.details ? { details: err.details } : {}),
            },
          },
          { status: err.statusCode }
        );
      }

      console.error('Unhandled API Error:', err);
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An internal server error occurred',
          },
        },
        { status: 500 }
      );
    }
  };
}
