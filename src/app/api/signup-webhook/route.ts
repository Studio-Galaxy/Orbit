import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const user = body.record;

    console.log("New signup:", user);

    await resend.emails.send({
      from: "Orbit <onboarding@resend.dev>",
      to: "studiogalaxy.org@gmail.com",
      subject: "🚀 New Orbit User Signup",
      html: `
        <h2>New Orbit User</h2>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>User ID:</strong> ${user.id}</p>
        <p><strong>Created:</strong> ${user.created_at}</p>
      `,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}