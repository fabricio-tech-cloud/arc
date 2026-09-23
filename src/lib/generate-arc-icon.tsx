import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

let fontPromise: Promise<Buffer> | null = null;

function loadTinos(): Promise<Buffer> {
  if (!fontPromise) {
    fontPromise = readFile(join(process.cwd(), "src/app/fonts/Tinos-Regular.ttf"));
  }
  return fontPromise;
}

/** Matches AppNav brand: Times-like serif, tracking 0.08em, --text on black. */
export async function generateArcIcon(size: number) {
  const fontData = await loadTinos();
  const fontSize = Math.round(size * 0.28);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          color: "#e8eaee",
          fontFamily: "Tinos",
          fontSize,
          fontWeight: 400,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        ARC
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: [
        {
          name: "Tinos",
          data: fontData,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
