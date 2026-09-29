module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({error:'OPENAI_API_KEY is not configured'});
  try {
    const { message, image } = req.body || {};
    const content = [{type:'input_text', text: message || 'Help with this HVAC/R question.'}];
    if (image) content.push({type:'input_image', image_url:image});
    const r = await fetch('https://api.openai.com/v1/responses', {
      method:'POST',
      headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-5.4-mini',instructions:'You are NOOR HVAC, a practical HVAC/R technical assistant. Be precise. Do not invent specifications. When exact model-specific information is required and not provided, say what information is needed.',input:[{role:'user',content}]})
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({error:data.error?.message || 'OpenAI request failed'});
    const out=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
    res.status(200).json({text:out || 'No text response returned.'});
  } catch(e) { res.status(500).json({error:e.message}); }
};
