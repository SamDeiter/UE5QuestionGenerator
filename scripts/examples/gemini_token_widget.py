import json
import datetime as dt
import threading
import time
import tkinter as tk
from pathlib import Path
from tkinter import messagebox

# =========================
# CONFIG
# =========================
POLL_INTERVAL_SECONDS = 30   # how often to refresh (seconds)
WINDOW_OPACITY = 0.9
BACKGROUND = "#111111"
FOREGROUND = "#00ff99"
FONT = ("Segoe UI", 10)

USAGE_LOG_PATH = Path("gemini_usage_log.jsonl")


def get_today_token_usage() -> int:
    """
    Read the local usage log and sum total tokens for 'today' (UTC).
    """
    if not USAGE_LOG_PATH.exists():
        return 0

    now = dt.datetime.utcnow()
    start_of_day = dt.datetime(now.year, now.month, now.day)
    end_of_day = start_of_day + dt.timedelta(days=1)

    total_tokens = 0

    with USAGE_LOG_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue

            ts_str = rec.get("timestamp_utc")
            if not ts_str:
                continue

            try:
                ts = dt.datetime.fromisoformat(ts_str)
            except ValueError:
                continue

            if not (start_of_day <= ts < end_of_day):
                continue

            total_tokens += int(rec.get("total_tokens", 0))

    return total_tokens


class TokenWidget:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Gemini Tokens")
        self.root.overrideredirect(True)   # borderless
        self.root.attributes("-topmost", True)
        self.root.attributes("-alpha", WINDOW_OPACITY)
        self.root.configure(bg=BACKGROUND)

        # initial position
        self.root.geometry("+60+60")

        self.label = tk.Label(
            root,
            text="Gemini: ...",
            font=FONT,
            fg=FOREGROUND,
            bg=BACKGROUND,
            padx=10,
            pady=5,
        )
        self.label.pack()

        # drag support
        self._drag_start_x = 0
        self._drag_start_y = 0
        self.label.bind("<Button-1>", self.start_drag)
        self.label.bind("<B1-Motion>", self.do_drag)

        # right-click menu
        self.label.bind("<Button-3>", self.on_right_click)

        self._stop_flag = False
        self.thread = threading.Thread(target=self.poll_loop, daemon=True)
        self.thread.start()

        self.update_label("Gemini: loading...")

    # ----- drag -----
    def start_drag(self, event):
        self._drag_start_x = event.x
        self._drag_start_y = event.y

    def do_drag(self, event):
        x = self.root.winfo_x() + event.x - self._drag_start_x
        y = self.root.winfo_y() + event.y - self._drag_start_y
        self.root.geometry(f"+{x}+{y}")

    # ----- menu -----
    def on_right_click(self, event):
        menu = tk.Menu(self.root, tearoff=0)
        menu.add_command(label="Quit", command=self.quit)
        try:
            menu.tk_popup(event.x_root, event.y_root)
        finally:
            menu.grab_release()

    def quit(self):
        self._stop_flag = True
        self.root.destroy()

    # ----- polling -----
    def poll_loop(self):
        while not self._stop_flag:
            try:
                total = get_today_token_usage()
                self.root.after(
                    0, self.update_label, f"Gemini today: {total:,} tokens"
                )
            except Exception as e:
                self.root.after(
                    0, self.update_label, f"ERR: {str(e)[:40]}"
                )

            for _ in range(POLL_INTERVAL_SECONDS):
                if self._stop_flag:
                    break
                time.sleep(1)

    def update_label(self, text: str):
        self.label.config(text=text)


def main():
    root = tk.Tk()
    try:
        app = TokenWidget(root)
        root.mainloop()
    except Exception as e:
        messagebox.showerror("Gemini Token Widget Error", str(e))
        root.destroy()


if __name__ == "__main__":
    main()
