import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const from = formData.get("from") as string;
    const to = formData.get("to") as string;

    const apiKey = process.env.CLOUDCONVERT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "CloudConvert API Key is missing. Please add CLOUDCONVERT_API_KEY to your environment variables." },
        { status: 500 }
      );
    }

    if (!file || !from || !to) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Create a Job
    const createJobRes = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "import-1": {
            operation: "import/upload",
          },
          "task-1": {
            operation: "convert",
            input: "import-1",
            input_format: from,
            output_format: to,
          },
          "export-1": {
            operation: "export/url",
            input: "task-1",
          },
        },
        tag: "orbit-conversion",
      }),
    });

    const job = await createJobRes.json();
    if (!createJobRes.ok) throw new Error(job.message || "Failed to create conversion job");

    const uploadTask = job.data.tasks.find((t: any) => t.name === "import-1");
    
    // 2. Upload File
    const uploadFormData = new FormData();
    Object.entries(uploadTask.result.form.parameters).forEach(([key, value]) => {
      uploadFormData.append(key, value as string);
    });
    uploadFormData.append("file", file);

    const uploadRes = await fetch(uploadTask.result.form.url, {
      method: "POST",
      body: uploadFormData,
    });

    if (!uploadRes.ok) throw new Error("Failed to upload file to CloudConvert");

    // 3. Poll for completion
    let exportTask: any;
    const maxRetries = 30;
    for (let i = 0; i < maxRetries; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${job.data.id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const statusData = await statusRes.json();
      
      exportTask = statusData.data.tasks.find((t: any) => t.name === "export-1");
      
      if (exportTask.status === "finished") break;
      if (exportTask.status === "error") throw new Error("CloudConvert conversion failed");
      
      if (i === maxRetries - 1) throw new Error("Conversion timed out");
    }

    const downloadUrl = exportTask.result.files[0].url;
    const fileName = exportTask.result.files[0].filename;

    return NextResponse.json({ url: downloadUrl, filename: fileName });
  } catch (error: any) {
    console.error("Conversion Error:", error);
    return NextResponse.json({ error: error.message || "Conversion failed" }, { status: 500 });
  }
}
