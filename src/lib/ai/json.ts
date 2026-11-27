export function extractJsonObject(text: string): unknown {
  const body = text.replace(/```(?:json)?/g, "");
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("no JSON object in the model reply");
  }
  return JSON.parse(body.slice(start, end + 1));
}
