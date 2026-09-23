#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test suite for BLACKCORE X-Inspector
"""

import unittest
from datetime import datetime, timezone
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from x_inspector import decode_snowflake, parse_target, calculate_bot_score

class TestXInspector(unittest.TestCase):

    def test_snowflake_decoding(self):
        # Known tweet ID: 2095873405752914010
        # Published at: 2026-09-04 13:55:34 UTC
        res = decode_snowflake(2095873405752914010)
        self.assertEqual(res["id"], 2095873405752914010)
        self.assertIn("2026-09-04 13:55:34", res["datetime_utc"])
        self.assertIn("iso", res)
        self.assertIn("worker_id", res)
        self.assertIn("datacenter_id", res)

    def test_user_snowflake_decoding(self):
        # Known user ID: 1711732984338878465
        # Created at: 2023-10-10 13:18:40 UTC
        res = decode_snowflake(1711732984338878465)
        self.assertEqual(res["id"], 1711732984338878465)
        self.assertIn("2023-10-10 13:18:40", res["datetime_utc"])

    def test_parse_target(self):
        # Profile URLs
        self.assertEqual(parse_target("https://x.com/elonmusk"), {"type": "profile", "username": "elonmusk"})
        self.assertEqual(parse_target("https://twitter.com/NewsLiberdade"), {"type": "profile", "username": "NewsLiberdade"})
        self.assertEqual(parse_target("@test_user"), {"type": "profile", "username": "test_user"})
        self.assertEqual(parse_target("simple_handle"), {"type": "profile", "username": "simple_handle"})
        
        # Tweet URLs
        tweet_res = parse_target("https://x.com/user/status/1234567890123456")
        self.assertEqual(tweet_res["type"], "tweet")
        self.assertEqual(tweet_res["username"], "user")
        self.assertEqual(tweet_res["tweet_id"], 1234567890123456)
        
        # Raw Snowflake
        snow_res = parse_target("2095873405752914010")
        self.assertEqual(snow_res["type"], "snowflake")
        self.assertEqual(snow_res["snowflake_id"], 2095873405752914010)

    def test_calculate_bot_score(self):
        # Human profile dummy
        dummy_human = {
            "username": "joaosilva",
            "posts_count": 500,
            "user_snowflake": {
                "epoch_seconds": datetime.now(timezone.utc).timestamp() - (500 * 86400) # 500 days ago
            },
            "bio": "Apenas um usuário comum compartilhando ideias."
        }
        score, reasons = calculate_bot_score(dummy_human)
        self.assertLessEqual(score, 30)

        # Bot profile dummy (extreme posts + trailing digits + scam bio)
        dummy_bot = {
            "username": "alert9988112233",
            "posts_count": 50000,
            "user_snowflake": {
                "epoch_seconds": datetime.now(timezone.utc).timestamp() - (100 * 86400) # 100 days ago (500 posts/day)
            },
            "bio": "Contact our appeal specialist on discord immediately to recover your account"
        }
        score_bot, reasons_bot = calculate_bot_score(dummy_bot)
        self.assertGreaterEqual(score_bot, 75)
        self.assertTrue(len(reasons_bot) >= 2)

if __name__ == "__main__":
    unittest.main()
