import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 220,
          background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 900,
          borderRadius: '96px',
          fontFamily: 'sans-serif',
          letterSpacing: '-6px',
        }}
      >
        DM
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  );
}
