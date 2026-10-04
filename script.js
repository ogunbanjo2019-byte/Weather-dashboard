document.addEventListener('DOMContentLoaded', () => {
  const API = 'https://api.open-meteo.com/v1/forecast';
  const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';
  const $ = (selector) => document.querySelector(selector);
  const cityInput = $('#city-input');
  const searchForm = $('#search-form');
  const locationButton = $('#location-button');
  const unitToggle = $('#unit-toggle');
  const alertBox = $('#alert');
  const forecastList = $('#forecast-list');
  const state = { unit: 'F', weather: null, hourly: false };
  const weatherMap = {
    0: ['Clear sky', '☀️', 'clear'], 1: ['Mainly clear', '🌤️', 'clear'], 2: ['Partly cloudy', '🌤️', 'cloudy'], 3: ['Overcast', '☁️', 'cloudy'],
    45: ['Foggy', '🌫️', 'cloudy'], 48: ['Rime fog', '🌫️', 'cloudy'], 51: ['Light drizzle', '🌦️', 'rain'], 53: ['Drizzle', '🌦️', 'rain'], 55: ['Heavy drizzle', '🌧️', 'rain'],
    56: ['Freezing drizzle', '🌧️', 'rain'], 57: ['Freezing drizzle', '🌧️', 'rain'], 61: ['Light rain', '🌦️', 'rain'], 63: ['Rain', '🌧️', 'rain'], 65: ['Heavy rain', '🌧️', 'rain'],
    66: ['Freezing rain', '🌧️', 'rain'], 67: ['Freezing rain', '🌧️', 'rain'], 71: ['Light snow', '🌨️', 'snow'], 73: ['Snow', '❄️', 'snow'], 75: ['Heavy snow', '❄️', 'snow'],
    77: ['Snow grains', '❄️', 'snow'], 80: ['Rain showers', '🌦️', 'rain'], 81: ['Rain showers', '🌧️', 'rain'], 82: ['Heavy showers', '⛈️', 'storm'], 85: ['Snow showers', '🌨️', 'snow'], 86: ['Snow showers', '❄️', 'snow'],
    95: ['Thunderstorm', '⛈️', 'storm'], 96: ['Thunderstorm + hail', '⛈️', 'storm'], 99: ['Thunderstorm + hail', '⛈️', 'storm']
  };
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  const getWeather = (code) => weatherMap[code] || ['Mixed conditions', '🌤️', 'cloudy'];
  const temp = (celsius) => Math.round(state.unit === 'C' ? celsius : (celsius * 9 / 5) + 32);
  const speed = (kmh) => Math.round(state.unit === 'C' ? kmh : kmh * 0.621371);
  const unitLabel = () => `°${state.unit}`;
  const formatTime = (iso, timezone, includeDate = false) => new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', ...(includeDate ? { weekday: 'long', month: 'long', day: 'numeric' } : {}) }).format(new Date(iso));
  const formatDay = (iso, timezone, index) => index === 0 ? 'Today' : new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(new Date(`${iso}T12:00:00`));
  const showAlert = (message) => { alertBox.textContent = message; alertBox.hidden = false; };
  const hideAlert = () => { alertBox.hidden = true; };
  const renderSkeletons = () => { forecastList.innerHTML = ''; for (let i = 0; i < 5; i += 1) forecastList.appendChild($('#skeleton-template').content.cloneNode(true)); };
  const setLoading = (loading) => { document.body.classList.toggle('is-loading', loading); if (loading) renderSkeletons(); };

  async function fetchJson(url) { const response = await fetch(url); if (!response.ok) throw new Error('Network request failed'); return response.json(); }
  async function resolveCity(query) {
    const data = await fetchJson(`${GEOCODE}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
    if (!data.results?.length) throw new Error(`We couldn't find “${query}”. Try a nearby city or check the spelling.`);
    return data.results[0];
  }
  async function fetchWeather(place) {
    const params = new URLSearchParams({ latitude: place.latitude, longitude: place.longitude, timezone: 'auto', forecast_days: '6', current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure', hourly: 'temperature_2m,weather_code,uv_index', daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max' });
    const data = await fetchJson(`${API}?${params}`); return { place, data };
  }
  async function loadPlace(place) {
    hideAlert(); setLoading(true);
    try { state.weather = await fetchWeather(place); renderDashboard(); $('#last-updated').textContent = `Updated ${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date())}`; } catch (error) { showAlert('The weather service is unavailable right now. Please try again in a moment.'); } finally { setLoading(false); }
  }
  async function loadCity(query) { if (!query.trim()) { showAlert('Enter a city name to search.'); return; } try { setLoading(true); const place = await resolveCity(query.trim()); await loadPlace(place); } catch (error) { setLoading(false); showAlert(error.message || 'We could not find that city. Please check the spelling.'); } }
  const windDirection = (degrees) => ['N','NE','E','SE','S','SW','W','NW'][Math.round(degrees / 45) % 8];
  function renderDashboard() {
    const { place, data } = state.weather; const current = data.current; const daily = data.daily; const todayWeather = getWeather(current.weather_code); const theme = todayWeather[2];
    document.body.className = `theme-${theme}`;
    $('#current-city').textContent = [place.name, place.admin1].filter(Boolean).join(', '); $('#current-country').textContent = place.country || '';
    $('#current-date').textContent = formatTime(current.time, data.timezone, true); $('#current-temp').textContent = temp(current.temperature_2m); $('#current-unit').textContent = unitLabel(); $('#current-condition').textContent = todayWeather[0]; $('#current-icon').textContent = todayWeather[1]; $('#current-icon').setAttribute('aria-label', todayWeather[0]); $('#feels-like').textContent = `${temp(current.apparent_temperature)}${unitLabel()}`;
    $('#humidity').textContent = `${current.relative_humidity_2m}%`; $('#wind').innerHTML = `${speed(current.wind_speed_10m)} <small>${state.unit === 'C' ? 'km/h' : 'mph'}</small>`; $('#wind-direction').textContent = `${windDirection(current.wind_direction_10m)} · ${current.wind_speed_10m < 20 ? 'Gentle breeze' : 'Breezy'}`; $('#pressure').innerHTML = `${Math.round(current.surface_pressure)} <small>hPa</small>`;
    const uv = Math.round(daily.uv_index_max[0] || 0); $('#uv-index').innerHTML = `${uv} <small>${uv < 3 ? 'Low' : uv < 6 ? 'Moderate' : 'High'}</small>`;
    $('#sunrise').textContent = formatTime(daily.sunrise[0], data.timezone); $('#sunset').textContent = formatTime(daily.sunset[0], data.timezone); updateDayProgress(daily.sunrise[0], daily.sunset[0]); renderForecast(); renderInsight(current, daily, todayWeather);
  }
  function updateDayProgress(sunrise, sunset) { const now = Date.now(), start = new Date(sunrise).getTime(), end = new Date(sunset).getTime(); const percentage = Math.max(3, Math.min(97, ((now - start) / (end - start)) * 100)); $('#day-progress').style.width = `${percentage}%`; $('#day-progress').nextElementSibling.style.left = `${percentage}%`; }
  function renderForecast() {
    const { data } = state.weather; const daily = data.daily; const cards = [];
    for (let i = 0; i < 5; i += 1) { const info = getWeather(daily.weather_code[i]); cards.push(`<article class="forecast-card ${i === 0 ? 'today' : ''}"><div class="forecast-day">${formatDay(daily.time[i], data.timezone, i)} <span>${Math.round(daily.precipitation_probability_max[i] || 0)}% rain</span></div><span class="forecast-icon">${info[1]}</span><div class="forecast-temp"><strong>${temp(daily.temperature_2m_max[i])}${unitLabel()}</strong><span>${temp(daily.temperature_2m_min[i])}${unitLabel()}</span></div><p class="forecast-condition">${info[0]}</p></article>`); }
    forecastList.innerHTML = cards.join('');
  }
  function renderInsight(current, daily, info) { const rain = daily.precipitation_probability_max[0] || 0; let title = 'A good day for getting outside'; let copy = 'The afternoon looks comfortable and clear. Don’t forget your sunglasses.'; if (rain > 50) { title = 'Keep an umbrella nearby'; copy = `There’s a ${Math.round(rain)}% chance of rain today. A cozy indoor afternoon might be the move.`; } else if (info[2] === 'snow') { title = 'Bundle up before heading out'; copy = 'Fresh, wintry conditions are on the way. Layer up and take it slow.'; } else if (current.wind_speed_10m > 30) { title = 'It’s a breezy one'; copy = 'Wind speeds are picking up today. Secure loose items and enjoy the fresh air.'; } $('#insight-title').textContent = title; $('#insight-copy').textContent = copy; }

  searchForm.addEventListener('submit', (event) => { event.preventDefault(); loadCity(cityInput.value); });
  locationButton.addEventListener('click', () => { if (!navigator.geolocation) { showAlert('Location services are not supported by this browser.'); return; } locationButton.disabled = true; locationButton.innerHTML = '<span>⌖</span> Locating…'; navigator.geolocation.getCurrentPosition(async ({ coords }) => { try { await loadPlace({ name: 'Your location', country: '', latitude: coords.latitude, longitude: coords.longitude }); } finally { locationButton.disabled = false; locationButton.innerHTML = '<span>⌖</span> Use current location'; } }, () => { showAlert('We couldn’t access your location. Please allow location access or search for a city.'); locationButton.disabled = false; locationButton.innerHTML = '<span>⌖</span> Use current location'; }, { timeout: 9000 }); });
  unitToggle.addEventListener('click', () => { state.unit = state.unit === 'C' ? 'F' : 'C'; unitToggle.setAttribute('aria-pressed', String(state.unit === 'F')); unitToggle.innerHTML = state.unit === 'C' ? '<span class="unit-active">°C</span><span>°F</span>' : '<span>°C</span><span class="unit-active">°F</span>'; if (state.weather) renderDashboard(); });
  document.querySelectorAll('.forecast-tab').forEach((tab) => tab.addEventListener('click', () => { document.querySelectorAll('.forecast-tab').forEach((item) => item.classList.remove('active')); tab.classList.add('active'); }));
  loadCity('San Francisco');
});
