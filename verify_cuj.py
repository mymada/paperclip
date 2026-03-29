from playwright.sync_api import sync_playwright
import os
import shutil

# Make sure directories exist
os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
os.makedirs("/home/jules/verification/videos", exist_ok=True)

def run_cuj(page):
    # Setup test file content
    page.goto("http://localhost:5174")
    page.wait_for_timeout(500)

    # We want to verify that mermaid diagrams are rendered safely
    # If there is a component exposing MarkdownBody we will test it.

    # Take screenshot
    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            context.close()
            browser.close()
