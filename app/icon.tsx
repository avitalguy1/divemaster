import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 192,
  height: 192,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 84,
          background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 900,
          borderRadius: '36px',
          fontFamily: 'sans-serif',
          letterSpacing: '-2px',
          boxShadow: '0 10px 25px rgba(2, 132, 199, 0.4)',
        }}
      >
        DM
      </div>
    ),
    {
      ...size,
    }
  );
}
