import fs from "fs";
import path from "path";
import { NextResponse as Response } from "next/server";


export async function GET(req: Request, { params }: any ) {
  const { testId } = await params;

  // Validate testId
  if (!testId) {
    return Response.json(
      { error: "Missing testId parameter" },
      { status: 400 } // Bad Request
    );
  }

  const baseFolder = "public\\uploads";
  const base = path.join(process.cwd(), baseFolder, `exam-${testId}`);

  // Check folder existence
  if (!fs.existsSync(base)) {
    console.log(`Folder not found: ${base}`);
    return Response.json(
      { error: `Folder not found: ${base}` },
      { status: 404 } // Not Found
    );
  }

  const exts = ["png", "jpg", "webp"];
  let pages: string[] = [];

  for (const ext of exts) {
    const possible: string[] = [];
    let i = 1;

    while (true) {
      const file = path.join(base, `page-${i}.${ext}`);
      if (!fs.existsSync(file)) break;

      possible.push(`/uploads/exam-${testId}/page-${i}.${ext}`);
      i++;
    }

    if (possible.length > 0) {
      pages = possible;
      break;
    }
  }

  if (pages.length === 0) {
    return Response.json(
      { error: "No pages found" },
      { status: 204 } // No Content
    );
  }

  return Response.json(
    { pages, totalPages: pages.length },
    { status: 200 }
  );
}
