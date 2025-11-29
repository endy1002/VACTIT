import { NextResponse as Response } from "next/server";

export const runtime = "nodejs";

interface SubmitBody {
  testId: string;
  answers: any;
}

export async function POST(req: Request) {
  try {
    const body: SubmitBody = await req.json();

    if (!body.testId || !body.answers) {
      return Response.json({ error: "Missing testId or answers" }, { status: 400 });
    }

    // TODO: handle saving the answers
    // Example: save to a database
    console.log("Submitted answers for exam:", body.testId);
    console.log("Answers:", body.answers);

    return Response.json({ message: "Submitted successfully" }, { status: 200 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
