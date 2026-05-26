export async function POST(request) {
  const form = await request.formData().catch(() => null);

  return Response.json({
    ok: true,
    callSid: form?.get("CallSid") || "",
    callStatus: form?.get("CallStatus") || "",
    direction: form?.get("Direction") || ""
  });
}
