Gemini Token Widget v1
======================

This small project gives you:

1) A Gemini client wrapper that logs token usage locally.
2) A floating, always-on-top Windows widget showing today's total tokens.

Files
-----

- gemini_client_with_usage.py
  Wrapper around Google Gemini that logs token usage into `gemini_usage_log.jsonl`.

- gemini_token_widget.py
  Tkinter-based floating widget that reads `gemini_usage_log.jsonl` and shows today's token total.

- .env (you create this)
  Holds your Gemini API key as GOOGLE_API_KEY.

Setup
-----

1. Install dependencies:

   pip install google-genai python-dotenv

2. Create a `.env` file **in the same folder** as the scripts:

   GOOGLE_API_KEY=YOUR_GEMINI_API_KEY_HERE

3. Make your Gemini calls through the wrapper:

   from gemini_client_with_usage import generate_text_with_usage

   resp = generate_text_with_usage("gemini-2.0-flash", "Explain Unreal Engine Blueprints.")
   print(resp.text)

   Each call appends usage info to `gemini_usage_log.jsonl`.

4. Run the widget in a second terminal:

   python gemini_token_widget.py

   - Left-drag on the text to move the window.
   - Right-click on the text to Quit.

Notes
-----

- Usage is aggregated "per UTC day" based on the timestamps in the usage log.
- The widget only reads local logs; it does NOT call Gemini itself.
- If you want per-model breakdown or monthly totals, you can extend `get_today_token_usage()`
  or add extra aggregation functions over `gemini_usage_log.jsonl`.
