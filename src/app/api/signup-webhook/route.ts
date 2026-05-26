import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  return NextResponse.json({
    message: "Signup webhook route is working",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("FULL BODY:", body);

    const user = body.record || body.user || body;

    const response = await resend.emails.send({
      from: "Orbit <onboarding@resend.dev>",
      to: "studiogalaxy.org@gmail.com",
      subject: "🚀 New Orbit User SignUp",
      html: `
        <h2>New Orbit User</h2>
        <p>Email: ${user.email}</p>
        <p>ID: ${user.id}</p>
      `,
    });

    console.log("RESEND RESPONSE:", response);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("ERROR:", error);

    return NextResponse.json(
      {
        error: String(error),
      },
      {
        status: 500,
      }
    );
  }
}