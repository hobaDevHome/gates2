export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const word = formData.get("word");

    // 1. Whisper
    const wForm = new FormData();
    wForm.append("file", file);
    wForm.append("model", "whisper-1");

    const wRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: wForm,
    });

    const wData = await wRes.json();
    const heard = (wData.text || "").trim();

    // 2. GPT
    const gRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Return JSON only: {correct: true/false, feedback: 'arabic short'}",
          },
          {
            role: "user",
            content: `Target: ${word}, Heard: ${heard}`,
          },
        ],
      }),
    });

    const gData = await gRes.json();
    const raw = gData.choices?.[0]?.message?.content || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(clean);
    } catch {
      result = { correct: false, feedback: "حاو ل تاني" };
    }

    res.status(200).json({
      heard,
      correct: result.correct,
      feedback: result.feedback,
    });
  } catch (err) {
    res.status(500).json({ error: "server error" });
  }
}
