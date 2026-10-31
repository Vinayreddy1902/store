"""Fail-closed smoke tests. Run: python -m unittest discover -s backend/tests"""
import os
import unittest
from backend import app as module


class AccessTests(unittest.TestCase):
    def test_missing_config_denies_auth(self):
        original = (module.ISSUER, module.AUDIENCE, module.jwks_client)
        try:
            module.ISSUER = ""
            module.AUDIENCE = ""
            module.jwks_client = None
            with self.assertRaises(module.HTTPException) as ctx:
                module.authenticated_user("Bearer anything")
            self.assertEqual(ctx.exception.status_code, 503)
        finally:
            module.ISSUER, module.AUDIENCE, module.jwks_client = original

    def test_missing_database_denies_entitlement(self):
        original = module.DATABASE
        try:
            module.DATABASE = "/nonexistent/store/entitlements.sqlite3"
            self.assertFalse(module.has_entitlement("user1", "ai_automation_blueprint"))
        finally:
            module.DATABASE = original

    def test_unknown_product_denied(self):
        self.assertFalse(module.has_entitlement("user1", "unknown"))


if __name__ == "__main__":
    unittest.main()
