from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from profiles import latest_comparison, survey_year


class ProfileTests(unittest.TestCase):
    def test_earlier_years_have_equal_weight_and_zeros_count(self):
        readings = [[day, "04-01", None, amount, flag] for day, amount, flag in [
            ("2019-04-01", 0, ""), ("2019-04-02", 20, ""), ("2020-04-01", 30, ""),
            ("2021-04-01", 50, "EARLY/LATE"), ("2022-04-01", 12, ""), ("2023-04-01", None, "")]]
        _, period, year, row, metric, earlier, _ = latest_comparison(readings)
        self.assertEqual((period, year, row[0], metric, earlier), ("04-01", 2022, "2022-04-01", 3, [10, 30]))
        self.assertIsNone(latest_comparison(readings[:3]))
        self.assertEqual(survey_year(["2019-12-29", "01-01"]), 2020)
