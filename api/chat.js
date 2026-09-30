module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
  }

  try {
    const { message, image, history = [] } = req.body || {};

    const input = [];

    // Add previous conversation so NOOR HVAC remembers what was discussed.
    for (const item of history) {
      if (!item || !item.role || !item.text) continue;

      input.push({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: [
          {
            type: item.role === 'assistant' ? 'output_text' : 'input_text',
            text: item.text
          }
        ]
      });
    }

    // Add the newest user message and optional equipment photo.
    const content = [
      {
        type: 'input_text',
        text: message || 'Help with this HVAC/R question.'
      }
    ];

    if (image) {
      content.push({
        type: 'input_image',
        image_url: image
      });
    }

    input.push({
      role: 'user',
      content
    });

    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',

        instructions: `
You are NOOR HVAC, a practical professional HVAC/R technical assistant.

Maintain context from the entire conversation provided to you.

If equipment has already been identified earlier in the conversation, remember
that equipment and continue troubleshooting it unless the user clearly changes
to another unit.

Do not ask the user again for information that is already present in the
conversation.

Pay close attention to equipment photos, nameplates, model numbers, serial
numbers, refrigerants, electrical information, measurements, symptoms, and
previous troubleshooting results.

Distinguish correctly between refrigeration equipment, furnaces, boilers,
air conditioners, heat pumps, mini-splits, rooftop units, and other HVAC/R
equipment. Do not give heat-pump troubleshooting steps for a commercial freezer.

Be precise and practical. Do not invent specifications or model-specific
information. If exact information is unavailable, clearly say what is unknown.
`,

        input
      })
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({
        error: data.error?.message || 'OpenAI request failed'
      });
    }

    const out = (data.output || [])
      .flatMap(x => x.content || [])
      .filter(x => x.type === 'output_text')
      .map(x => x.text)
      .join('\n');

    return res.status(200).json({
      text: out || 'No text response returned.'
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
