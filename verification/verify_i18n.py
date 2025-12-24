from playwright.sync_api import sync_playwright
import time

def verify():
    with sync_playwright() as p:
        # Test English
        print("Launching browser for English...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(locale='en-US')
        page = context.new_page()

        try:
            page.goto("http://localhost:5173/login", timeout=60000)
            page.wait_for_load_state("networkidle")
            # Wait a bit for i18n to load
            time.sleep(2)
            page.screenshot(path="/home/jules/verification/login_en.png")
            print("Captured login_en.png")
        except Exception as e:
            print(f"Error in EN: {e}")
        finally:
            context.close()
            browser.close()

        # Test Japanese
        print("Launching browser for Japanese...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(locale='ja-JP')
        page = context.new_page()

        try:
            page.goto("http://localhost:5173/login", timeout=60000)
            page.wait_for_load_state("networkidle")
            time.sleep(2)
            page.screenshot(path="/home/jules/verification/login_ja.png")
            print("Captured login_ja.png")
        except Exception as e:
            print(f"Error in JA: {e}")
        finally:
            context.close()
            browser.close()

if __name__ == "__main__":
    # Wait for server to be likely ready
    time.sleep(5)
    verify()
