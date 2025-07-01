import { given, then, when } from 'test-fns';

import { getContextOpenAI } from '../../__test_assets__/getContextOpenAI';
import { Stitch } from '../../domain/objects/Stitch';
import { GStitcher, StitcherImagine } from '../../domain/objects/Stitcher';
import { Thread } from '../../domain/objects/Thread';
import { Threads } from '../../domain/objects/Threads';
import { imagineViaOpenAI } from './adapters/imagineViaOpenAI';
import { enstitch } from './enstitch';

describe('invokeImagineStitcher', () => {
  given.runIf(!process.env.CI)('a representative imagine stitcher', () => {
    const context = { log: console, ...getContextOpenAI() };

    const stitcher = new StitcherImagine<
      GStitcher<Threads<'author', { author: { factset: string[] } }>>
    >({
      form: 'IMAGINE',
      slug: 'fillout-stub',
      readme:
        'intent(fills out a stub of code); note(good example for impact of context)',
      enprompt: ({ threads }) =>
        [
          'fillout the code of the given stubout',
          'context.factset = ',
          threads.author.context.factset.join('\n - '),
          '',
          'here is the stubout',
          threads.author.stitches.slice(-1)[0]?.output,
          '',
          'fillout the code of the given stubout',
        ].join('\n'),
      imagine: imagineViaOpenAI,
      deprompt: ({ promptOut, promptIn }) =>
        new Stitch({ output: promptOut, input: promptIn }),
    });

    const stubout = `
/**
 * .what = calls the open-meteo weather api
 * .how =
 *   - uses procedural pattern
 *   - fails fast
 */
export const sdkOpenMeteo = {
  getWeather: (input: {...}, context: VisualogicContext & AuthContextOpenMeteo) => {
    ...
  }
}
    `.trim();

    when('thread has blank context', () => {
      const thread = new Thread({
        context: { role: 'author' as const, factset: [] },
        stitches: [{ output: stubout, input: null }],
      });

      then('it should be able to stitch', async () => {
        const stitch = await enstitch(
          { stitcher, threads: { author: thread } },
          context,
        );
        console.log(stitch.input);
        console.log(stitch.output);
        expect(stitch.output).toContain('sdkOpenMeteo');
      });
    });

    when('thread has context', () => {
      const thread = new Thread({
        context: {
          role: 'author' as const,
          factset: [
            `example of usage of open-meteo

\`\`\`ts
import { fetchWeatherApi } from 'openmeteo';

const params = {
    latitude: [52.54],
    longitude: [13.41],
    current: 'temperature_2m,weather_code,wind_speed_10m,wind_direction_10m',
    hourly: 'temperature_2m,precipitation',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min'
};
const url = 'https://api.open-meteo.com/v1/forecast';
const responses = await fetchWeatherApi(url, params);

// Helper function to form time ranges
const range = (start: number, stop: number, step: number) =>
 Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

// Process first location. Add a for-loop for multiple locations or weather models
const response = responses[0];

// Attributes for timezone and location
const utcOffsetSeconds = response.utcOffsetSeconds();
const timezone = response.timezone();
const timezoneAbbreviation = response.timezoneAbbreviation();
const latitude = response.latitude();
const longitude = response.longitude();

const current = response.current()!;
const hourly = response.hourly()!;
const daily = response.daily()!;

// Note: The order of weather variables in the URL query and the indices below need to match!
const weatherData = {
    current: {
        time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
        temperature: current.variables(0)!.value(), // Current is only 1 value, therefore \`.value()\`
        weatherCode: current.variables(1)!.value(),
        windSpeed: current.variables(2)!.value(),
        windDirection: current.variables(3)!.value()
    },
    hourly: {
        time: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map(
            (t) => new Date((t + utcOffsetSeconds) * 1000)
        ),
        temperature: hourly.variables(0)!.valuesArray()!, // \`.valuesArray()\` get an array of floats
        precipitation: hourly.variables(1)!.valuesArray()!,
    },
    daily: {
        time: range(Number(daily.time()), Number(daily.timeEnd()), daily.interval()).map(
            (t) => new Date((t + utcOffsetSeconds) * 1000)
        ),
        weatherCode: daily.variables(0)!.valuesArray()!,
        temperatureMax: daily.variables(1)!.valuesArray()!,
        temperatureMin: daily.variables(2)!.valuesArray()!,
    }
};

// \`weatherData\` now contains a simple structure with arrays for datetime and weather data
for (let i = 0; i < weatherData.daily.time.length; i++) {
  console.log(
    weatherData.daily.time[i].toISOString(),
    weatherData.daily.weatherCode[i],
    weatherData.daily.temperatureMax[i],
    weatherData.daily.temperatureMin[i]
  );
}

\`\`\`
          `.trim(),
            `open-meteo forecast response shape

On success a JSON object will be returned.

{
    "latitude": 52.52,
    "longitude": 13.419,
    "elevation": 44.812,
    "generationtime_ms": 2.2119,
    "utc_offset_seconds": 0,
    "timezone": "Europe/Berlin",
    "timezone_abbreviation": "CEST",
    "hourly": {
        "time": ["2022-07-01T00:00", "2022-07-01T01:00", "2022-07-01T02:00", ...],
        "temperature_2m": [13, 12.7, 12.7, 12.5, 12.5, 12.8, 13, 12.9, 13.3, ...]
    },
    "hourly_units": {
        "temperature_2m": "°C"
    }
}
Parameter	Format	Description
latitude, longitude	Floating point	WGS84 of the center of the weather grid-cell which was used to generate this forecast. This coordinate might be a few kilometers away from the requested coordinate.
elevation	Floating point	The elevation from a 90 meter digital elevation model. This effects which grid-cell is selected (see parameter cell_selection). Statistical downscaling is used to adapt weather conditions for this elevation. This elevation can also be controlled with the query parameter elevation. If &elevation=nan is specified, all downscaling is disabled and the averge grid-cell elevation is used.
generationtime_ms	Floating point	Generation time of the weather forecast in milliseconds. This is mainly used for performance monitoring and improvements.
utc_offset_seconds	Integer	Applied timezone offset from the &timezone= parameter.
timezone
timezone_abbreviation	String	Timezone identifier (e.g. Europe/Berlin) and abbreviation (e.g. CEST)
hourly	Object	For each selected weather variable, data will be returned as a floating point array. Additionally a time array will be returned with ISO8601 timestamps.
hourly_units	Object	For each selected weather variable, the unit will be listed here.
daily	Object	For each selected daily weather variable, data will be returned as a floating point array. Additionally a time array will be returned with ISO8601 timestamps.
daily_units	Object	For each selected daily weather variable, the unit will be listed here.
`,
            'we want to declare an explicit output type with a simplified name pattern. for example, Weather { label: "sunny" | ..., temp: { high, low }, rain, etc }',
          ],
        },
        stitches: [{ output: stubout, input: null }],
      });
      then('it should leverage the knowledge of the context', async () => {
        const stitch = await enstitch(
          { stitcher, threads: { author: thread } },
          context,
        );
        console.log(stitch.input);
        console.log(stitch.output);
        expect(stitch.output).toContain('sdkOpenMeteo');
        expect(stitch.output).toContain('temperature_2m');
      });
    });
  });
});
