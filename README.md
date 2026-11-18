# Snow Courses

[Open Snow Courses](https://coolcode.ca/snowcourses/) to compare the same survey period at a B.C. snow course across years, or the same calendar date at one of six Fraser basin automated stations.

<!-- coolcode:guide -->
Try Grouse Mountain’s April survey, then select Barkerville under Automated station to compare the same date across earlier winters. The table separates missing readings, reported zeros and source flags.
<!-- /coolcode:guide -->

## Reading a comparison

Snow depth is measured in centimetres. Snow water equivalent is the depth in millimetres of water contained in that snow. Use the measurement selector to switch the chart and historical median. The chart shows the 20 newest numeric observations for the selected period, and the CSV and table contain the complete matching series. The comparison year selects a reading and changes which earlier years enter the median. Where several readings share a period and year, the summary uses the last reading, and each earlier year contributes its median of eligible values.

Manual courses use the province’s nominal survey periods, such as April 1, even when the field crew visited a few days earlier or later. The observation date stays visible. Source flags are shown in the table. Flagged manual records and missing values do not enter the historical median. A measured numeric zero does. Some archived courses no longer report.

The automatic series covers Yellowhead Lake, McBride Upper, Barkerville, Mount Timothy, Mission Ridge and Shovelnose Mountain. We join the provincial daily water-equivalent archive with 16:00 UTC readings from the current hourly files. Only the current hourly file supplies automated snow depth in this edition. Negative and blank values are treated as unavailable. Automatic measurements and field surveys have independent station IDs and are compared within their own method.

## Sources and refresh

The [Province of British Columbia’s data package](https://github.com/bcgov/bcsnowdata) documents the [manual archive](https://www.env.gov.bc.ca/wsd/data_searches/snow/asws/data/allmss_archive.csv), [current manual surveys](https://www.env.gov.bc.ca/wsd/data_searches/snow/asws/data/allmss_current.csv), [daily automated water archive](https://www.env.gov.bc.ca/wsd/data_searches/snow/asws/data/SW_DailyArchive.csv), [current water equivalent](https://www.env.gov.bc.ca/wsd/data_searches/snow/asws/data/SW.csv) and [current depth](https://www.env.gov.bc.ca/wsd/data_searches/snow/asws/data/SD.csv). Contains information licensed under the Open Government Licence – British Columbia.

A daily GitHub Action fetches the five files, validates coverage and publishes the complete snapshot. Data retrieved records the successful download in UTC. Latest source date records the newest included numeric observation. A failed refresh preserves the last published comparison. Run `python3 scripts/refresh.py`, `node --test tests/*.test.mjs`, `python3 -m unittest discover -s tests` and `python3 scripts/build.py`. Source preparation is independent of the offline static build.
