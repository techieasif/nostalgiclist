import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon: a cassette reel in truck-art red on marigold. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f2a71b",
          borderRadius: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 20,
            height: 20,
            borderRadius: 10,
            border: "4px solid #c22d2d",
            background: "#f7e8c9",
          }}
        />
      </div>
    ),
    size
  );
}
