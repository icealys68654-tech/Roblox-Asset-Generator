"""Validation tests for the bounded Roblox documentation snapshot tool."""
import io
import unittest
from unittest.mock import patch

import docs_service


class ParserTests(unittest.TestCase):
    def test_extracts_visible_text_and_skips_executable_or_hidden_content(self):
        parser = docs_service.VisibleTextParser()
        parser.feed("<title>Roblox Docs</title><h1>Engine</h1><p>Visible &amp; useful</p>"
                    "<script>secret()</script><style>.x{}</style><noscript>hidden</noscript>")
        self.assertEqual(parser.title, "Roblox Docs")
        self.assertIn("Visible & useful", parser.text)
        self.assertNotIn("secret", parser.text)
        self.assertNotIn("hidden", parser.text)

    def test_text_is_capped(self):
        parser = docs_service.VisibleTextParser()
        parser.feed("x" * (docs_service.MAX_TEXT_CHARS + 10))
        self.assertEqual(len(parser.text), docs_service.MAX_TEXT_CHARS)


class ValidationTests(unittest.TestCase):
    def test_only_approved_sources_are_accepted(self):
        self.assertEqual(docs_service._validate_source("engine"), docs_service.SOURCES["engine"])
        with self.assertRaises(docs_service.DocsFetchError):
            docs_service._validate_source("https://example.com/")

    def test_redirect_must_remain_on_approved_https_docs_path(self):
        redirect = docs_service.ApprovedRedirects()
        with self.assertRaises(docs_service.DocsFetchError):
            redirect.redirect_request(None, None, 302, "Found", {}, "https://example.com/docs/x")
        with self.assertRaises(docs_service.DocsFetchError):
            redirect.redirect_request(None, None, 302, "Found", {}, "http://create.roblox.com/docs/x")

    def test_response_body_limit_is_enforced(self):
        with self.assertRaises(docs_service.DocsFetchError):
            docs_service._read_bounded(io.BytesIO(b"12345"), limit=4)
        self.assertEqual(docs_service._read_bounded(io.BytesIO(b"1234"), limit=4), b"1234")

    @patch("docs_service.build_opener")
    def test_fetch_rejects_non_html(self, build_opener):
        class Headers:
            def get_content_type(self):
                return "application/octet-stream"

        class Response:
            headers = Headers()
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def geturl(self): return docs_service.SOURCES["engine"]

        build_opener.return_value.open.return_value = Response()
        with self.assertRaises(docs_service.DocsFetchError):
            docs_service.fetch_source("engine")


if __name__ == "__main__":
    unittest.main()
