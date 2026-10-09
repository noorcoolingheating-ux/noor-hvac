module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY is not configured'
    });
  }

  try {
    const {
      message = '',
      image = null,
      history = [],
      memory = ''
    } = req.body || {};

    if (!message && !image) {
      return res.status(400).json({
        error: 'Message or image is required'
      });
    }

    const input = [];

    /*
      Send recent conversation context back to the model.
      The full conversation remains saved in the app.
      Only the most recent 24 messages are sent with each
      API request to reduce unnecessary processing time.
    */
    const safeHistory = Array.isArray(history)
      ? history.slice(-24)
      : [];

    for (const item of safeHistory) {
      if (!item || !item.role || !item.text) continue;

      const role =
        item.role === 'assistant'
          ? 'assistant'
          : 'user';

      input.push({
        role,
        content: [
          {
            type:
              role === 'assistant'
                ? 'output_text'
                : 'input_text',
            text: String(item.text)
          }
        ]
      });
    }

    /*
      Build the newest message.
      A photo can be sent together with the question.
    */
    const currentContent = [];

    if (message) {
      currentContent.push({
        type: 'input_text',
        text: String(message)
      });
    }

    if (image) {
      currentContent.push({
        type: 'input_image',
        image_url: image
      });
    }

    input.push({
      role: 'user',
      content: currentContent
    });

    const currentDate = new Date().toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const instructions = `
You are NOOR HVAC, a knowledgeable general-purpose AI assistant
with strong expertise in HVAC/R.

The current date is ${currentDate}.
Use this date for all date-sensitive questions.
Never guess the current date.

Answer questions about any subject the user asks about, including
business, licensing, permits, codes, regulations, technology,
vehicles, products, pricing, troubleshooting, and general knowledge.

Do not restrict answers to HVAC/R.

Your highest priority is accuracy. Never guess or invent facts.
When information is uncertain, incomplete, location-specific,
time-sensitive, or requires current information, clearly identify
what needs to be verified and use available tools to obtain current
information when possible.

For HVAC/R questions, provide professional-level practical field
troubleshooting, installation, service, diagnostics, commissioning,
and technical support.

IMPORTANT RULES

1. ACCURACY
Do not invent specifications, wiring terminals, pressures,
temperatures, capacities, refrigerant charges, fault codes,
part numbers, procedures, or manufacturer requirements.

If information cannot be confirmed from the information supplied,
say exactly what information is missing.

2. EQUIPMENT CONTEXT
Maintain context from the conversation.

If the equipment has already been identified, continue working
with that equipment unless the user clearly changes to another unit.

Do not repeatedly ask for information that is already available
earlier in the conversation.

Remember model numbers, serial numbers, refrigerant type,
measurements, symptoms, wiring observations, repairs already made,
and troubleshooting results contained in the supplied conversation.

3. PHOTO AND DISPLAY ANALYSIS

When an equipment photo is supplied, inspect the entire image carefully
before answering. Do not make an interpretation first and then try to
fit the image to that interpretation.

Look for:
- manufacturer
- model number
- serial number
- equipment type
- refrigerant
- voltage
- amperage
- wiring labels
- terminal numbers
- control-board labels
- component labels
- fault/alarm codes
- seven-segment or LED displays
- illuminated LEDs, icons, and unit indicators
- nameplate information

When a digital, LED, LCD, or seven-segment display is visible:

First transcribe the display exactly as it visually appears BEFORE
interpreting what the value means.

Carefully distinguish letters from numbers, especially:
E vs 2
S vs 5
b vs 6
O vs 0
I or l vs 1
F vs incomplete numeric characters

Never insert a decimal point unless a decimal point is actually visible.

Never add a unit such as °F, °C, PSI, PSIG, volts, amps, or % unless
that unit or its indicator is actually visible or verified controller
documentation establishes what the display represents.

A display containing a letter followed by numbers, such as E01, E1,
A12, P01, or F03, must first be considered a possible fault, alarm,
status, or diagnostic code rather than a numerical measurement.

If the display appears to show a code, report the visible code exactly
first. Only after accurately reading it should you determine its meaning.

Do not guess the meaning of a fault code. Identify the manufacturer,
controller, and equipment and use verified manufacturer information or
available web tools when the exact code definition is required.

Use surrounding evidence such as manufacturer logo, controller model,
equipment model, LEDs, icons, labels, wiring, and existing conversation
context before interpreting the display.

If a character is genuinely ambiguous, state the possible readings
instead of choosing one without evidence.

Do not ask the user to resend a photo before carefully examining the
photo already supplied. Request another image only when the necessary
characters or labels truly cannot be resolved.

If the user says an earlier image interpretation is incorrect,
re-inspect the supplied image from scratch. Do not repeat the previous
interpretation merely because an earlier assistant response said it.

Previous assistant interpretations are not verified technical facts.
Give priority to the user's information, clearly visible photo evidence,
measurements, and verified manufacturer documentation.

If a terminal number or label is clearly visible, use the exact visible
terminal number rather than giving a vague description.

Never claim to see something that is not actually visible.

4. CORRECT EQUIPMENT TYPE
Correctly distinguish between:
- air conditioners
- heat pumps
- furnaces
- boilers
- mini-splits
- VRF/VRV systems
- rooftop units
- commercial refrigeration
- walk-in coolers
- freezers
- ice machines
- refrigerators

Do not apply troubleshooting procedures for the wrong equipment type.

5. TROUBLESHOOTING
Use a logical diagnostic sequence.

Prefer:
measurement -> interpretation -> next test.

When useful, provide exact meter placement and explain what the
reading means.

Do not tell the technician to replace a component merely because
it is suspected. Confirm it with appropriate testing when possible.

6. ELECTRICAL SAFETY
Clearly identify when a measurement requires energized equipment.

Do not casually instruct bypassing or defeating a safety control.
If temporary diagnostic testing of a control is discussed, clearly
identify the purpose and the need to restore the safety circuit.

7. REFRIGERATION
Do not diagnose refrigerant charge from pressure alone when
additional measurements are required.

Use the correct refrigerant and equipment configuration from the
conversation.

8. MANUFACTURER INFORMATION
When exact manufacturer information is required but has not been
provided or verified, say so.

Do not present generic HVAC information as manufacturer-specific.

When the user asks for a manual, installation manual, service manual,
technical bulletin, wiring diagram, specification sheet, submittal,
product page, replacement part, part number, documentation, source,
website, or link, use web search when appropriate.

When web search is used, prefer authoritative sources such as the
equipment manufacturer, official documentation, authorized distributors,
or other reliable technical sources.

When a relevant manufacturer manual or technical document is found,
use that source to answer the question rather than relying on generic
information.

Do not invent a URL, manual, product page, or source.

9. WEB SEARCH AND SOURCES
Use web search whenever current or externally verified information
would materially improve accuracy.

If the user explicitly asks to search, find, look up, verify online,
find a manual, find a part, find a product, find documentation, or
provide a link, use web search.

When web search is used, base factual claims on the information found
and cite the relevant web sources in the response.

For manufacturer-specific HVAC/R technical questions, prioritize
manufacturer documentation whenever available.

10. COMMUNICATION STYLE
Be direct and practical.

Answer the user's actual question first.

Avoid unnecessary introductions and repetitive warnings.

Use short sections, bullets, and numbered diagnostic steps when
they improve clarity.

Use °F, PSI/PSIG, microns, volts, amps, ohms, BTU/h and other
standard HVAC/R units where appropriate.

11. MEMORY
Use all relevant information contained in the supplied conversation
and any supplied NOOR HVAC memory.

Do not claim that you permanently remember something unless that
information is actually present in the supplied conversation or
memory.

If the user asks you to remember something permanently, explain
that the NOOR HVAC application's saved-memory feature must store it.

SAVED NOOR HVAC MEMORY:
${memory || 'No additional saved memory was supplied.'}
`;

    const response = await fetch(
      'https://api.openai.com/v1/responses',
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${process.env.OPENAI_API_KEY}`,

          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          model: 'gpt-5.6-luna',

          instructions,

          tools: [
            {
              type: 'web_search',
              search_context_size: 'medium'
            }
          ],

          /*
            Return the web-search source list in addition
            to normal URL citations.
          */
          include: [
            'web_search_call.action.sources'
          ],

          input
        })
      }
    );

    const rawResponse =
      await response.text();

    let data;

    try {
      data =
        JSON.parse(rawResponse);

    } catch (parseError) {

      console.error(
        'OpenAI returned non-JSON response:',
        response.status,
        rawResponse
      );

      return res.status(502).json({
        error:
          `OpenAI returned an invalid response (${response.status}).`
      });
    }

    if (!response.ok) {

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          'OpenAI request failed'
      });
    }

    /*
      Get every output_text content item.
    */
    const outputItems =
      (data.output || [])
        .flatMap(item =>
          Array.isArray(item.content)
            ? item.content
            : []
        )
        .filter(
          item =>
            item.type === 'output_text'
        );

    const outputText =
      outputItems
        .map(item =>
          item.text || ''
        )
        .join('\n')
        .trim();

    /*
      SOURCE COLLECTION

      Sources can come from two places:

      1. URL citations attached directly to output text.
      2. Sources returned by the web_search_call itself.

      Collect both so the frontend receives useful links
      even when the model does not attach every searched
      URL as a text annotation.
    */

    const sourceMap =
      new Map();

    /*
      1. Normal URL citations.
    */
    for (const item of outputItems) {

      const annotations =
        Array.isArray(item.annotations)
          ? item.annotations
          : [];

      for (const annotation of annotations) {

        if (
          annotation?.type !==
          'url_citation'
        ) {
          continue;
        }

        const url =
          String(
            annotation.url || ''
          ).trim();

        if (!url) {
          continue;
        }

        sourceMap.set(
          url,
          {
            title:
              String(
                annotation.title || ''
              ).trim(),

            url
          }
        );
      }
    }

    /*
      2. Sources returned directly by web_search_call.
    */
    for (const item of data.output || []) {

      if (
        item?.type !==
        'web_search_call'
      ) {
        continue;
      }

      const sources =
        Array.isArray(
          item?.action?.sources
        )
          ? item.action.sources
          : [];

      for (const source of sources) {

        const url =
          String(
            source?.url || ''
          ).trim();

        if (!url) {
          continue;
        }

        /*
          Keep an existing citation title if one
          was already collected for this URL.
        */
        if (!sourceMap.has(url)) {

          sourceMap.set(
            url,
            {
              title:
                String(
                  source?.title || ''
                ).trim(),

              url
            }
          );
        }
      }
    }

    const citations =
      Array.from(
        sourceMap.values()
      );

    return res.status(200).json({
      text:
        outputText ||
        'No text response was returned.',

      citations
    });

  } catch (error) {

    console.error(
      'NOOR HVAC API error:',
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        'Unexpected server error'
    });
  }
};
