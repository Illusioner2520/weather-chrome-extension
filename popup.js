let weatherinfo = {}
let unit = localStorage.tunit ? localStorage.tunit : "f";
let sunit = localStorage.sunit ? localStorage.sunit : "mph";
document.getElementById("degree").value = unit;
document.getElementById("speed").value = sunit;
let did = 0;
let hid = 0;
navigator.geolocation.getCurrentPosition(
	(loc) => {
		const { coords } = loc;
		let { latitude, longitude } = coords;
		document.getElementsByClassName("top-input")[0].value = `${latitude},${longitude}`
		getWeatherFromCoords(latitude, longitude)
	},
	(err) => {
		header.innerText = 'error (check console)';
		console.error(err);
	}
);
async function getWeatherFromCoords(latitude, longitude) {
	document.getElementsByClassName("loading")[0].innerHTML = "Weather data is loading."
	toggleLoading(true)
	let data = await getJSON(`https://api.weather.gov/points/${latitude},${longitude}`);
	if (data == null) {
		document.getElementsByClassName("loading")[0].innerHTML = "Weather data failed to load."
		document.getElementsByClassName("weather-location")[0].innerHTML = `Location for weather unknown.`
		return;
	}
	document.getElementsByClassName("weather-location")[0].innerHTML = `Weather for ${data.properties.relativeLocation.properties.city}, ${data.properties.relativeLocation.properties.state}`
	let success = (await getWeatherFromGridID(data.properties.gridId, data.properties.gridX, data.properties.gridY, data.properties.forecastZone.replaceAll("https://api.weather.gov/zones/forecast/", "")));
	if (!success) {
		document.getElementsByClassName("loading")[0].innerHTML = "Weather data failed to load."
	}
	return success;
}
function toggleLoading(l) {
	document.getElementsByClassName("day-container")[0].style.display = l ? "none" : "flex";
	document.getElementsByClassName("day-info-cards")[0].style.display = l ? "none" : "flex";
	document.getElementsByClassName("hour-container")[0].style.display = l ? "none" : "flex";
	document.getElementsByClassName("hour-info-cards")[0].style.display = l ? "none" : "grid";
	if (l) document.getElementsByClassName("alerts")[0].style.display = "none";
	document.getElementsByClassName("loading")[0].style.display = l ? "block" : "none";
}
function getWeatherFromCity(city, state) {

}
function getWeatherFromText(val) {
	val = val.replaceAll(" ","")
	getWeatherFromCoords(val.split(",")[0],val.split(",")[1])
}
$(".top-input").on("change",function() {
	getWeatherFromText(this.value)
});
$("#degree").on("change",function() {
	unit = this.value;
	localStorage.tunit = this.value;
	reloadItems();
	showWeatherDay(did);
	showWeatherHour(hid);
});
$("#speed").on("change",function() {
	sunit = this.value;
	localStorage.sunit = this.value;
	showWeatherDay(did);
	showWeatherHour(hid);
});
$(".settings").on("click",function() {
	let popup = $(".settings-popup");
	let open = popup.attr("data-open")
	console.log(open)
	console.log(popup.attr("style"))
	if (open == "true") {
		popup.css("display","none")
		popup.attr("data-open","false")
	} else if (open == "false") {
		popup.css("display","flex")
		popup.attr("data-open","true")
	}
});
$(document).on("click",function(e) {
	let popup = $(".settings-popup");
	let open = popup.attr("data-open")
	if (open == "false") return;
	console.log(e.target)
	let m = [".settings-popup",".settings-popup *",".settings","i"];
	for (let i = 0; i < m.length; i++) {
		if (e.target.matches(m[i])) return;
	}
	popup.css("display","none")
	popup.attr("data-open","false")
});
async function getWeatherFromGridID(gridId, gridX, gridY, zoneId) {
	let forecast = await getJSON(`https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast`)
	let hourly = await getJSON(`https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast/hourly`);
	let alerts = await getJSON(`https://api.weather.gov/alerts/active/zone/${zoneId}`)
	if (forecast == null || hourly == null || alerts == null) return false;
	weatherinfo.forecast = forecast;
	weatherinfo.hourly = hourly;
	weatherinfo.alerts = alerts;
	reloadItems();
	showWeatherDay(0)
	showWeatherHour(0)
	return true;
}
function reloadItems() {
	let forecast = weatherinfo.forecast;
	let hourly = weatherinfo.hourly;
	let code = "";
	for (let i = 0; i < forecast.properties.periods.length; i++) {
		let info = forecast.properties.periods[i];
		let selected = i == 0 ? " selected" : "";
		code += `<div data-number="${i}" class="day${selected}"><div style="background-image:url(${info.icon})" class="day-icon"><div class="short-temp">${convertTemps(info.temperature,"f",unit)}</div></div><div class="day-text">${info.name}</div></div>`
	}
	document.getElementsByClassName("day-container")[0].innerHTML = code + `<div class="day-container-arrow day-container-right-arrow"><i class="fa-solid fa-chevron-right"></i></div><div class="day-container-arrow day-container-left-arrow" style="display:none"><i class="fa-solid fa-chevron-left"></i></div>`;
	let hourcode = "";
	for (let i = 0; i < hourly.properties.periods.length; i++) {
		let info = hourly.properties.periods[i];
		let selected = i == 0 ? " hour-selected" : "";
		let date = new Date(info.startTime)
		hourcode += `<div data-hour-number="${i}" class="hour${selected}"><div style="background-image:url(${info.icon})" class="hour-icon"><div class="short-temp">${convertTemps(info.temperature,"f",unit)}</div></div><div class="hour-text">${date.getHours() % 12 == 0 ? 12 : date.getHours() % 12}:00 ${date.getHours() > 12 ? "PM" : "AM"}</div></div>`
	}
	document.getElementsByClassName("hour-container")[0].innerHTML = hourcode + `<div class="hour-container-arrow hour-container-right-arrow"><i class="fa-solid fa-chevron-right"></i></div><div class="hour-container-arrow hour-container-left-arrow" style="display:none"><i class="fa-solid fa-chevron-left"></i></div>`;
	$(".day").on("click", function () { selectDay($(this)) })
	$(".hour").on("click", function () { selectHour($(this)) })
	$(".day-container-left-arrow").on("click", function () { shiftDays(-1) })
	$(".day-container-right-arrow").on("click", function () { shiftDays(1) })

	$(".hour-container-left-arrow").on("click", function () { shiftHours(-1) })
	$(".hour-container-right-arrow").on("click", function () { shiftHours(1) })
	displayAlerts();
	toggleLoading(false)
	return true
}

function openDropdown(titleele) {
	if (titleele.getAttribute("open") == "false" || titleele.getAttribute("open") == null) {
		titleele.children[1].style.transform = "rotate(180deg)"
		$(titleele.nextSibling).slideDown("500");
		titleele.setAttribute("open", "true");
	} else if (titleele.getAttribute("open") == "true") {
		titleele.setAttribute("open", "false");
		titleele.children[1].style.transform = "rotate(0deg)"
		$(titleele.nextSibling).slideUp("500");
		setTimeout(function () {
			titleele.children[0].classList.remove("closed");
		}, 1000);
	}
}

function displayAlerts() {
	let alerts = weatherinfo.alerts.features;
	let alertcode = "";
	for (let i = 0; i < alerts.length; i++) {
		alertcode += `<div class="alert"><div class="alert-short"><div class="alert-title">${alerts[i].properties.event}</div><div class="alert-arrow">▼</div></div><div class="alert-long">${alerts[i].properties.headline}<br><br>${(alerts[i].properties.description).replaceAll("\n\n","<br>").replaceAll("\n"," ")}</div></div>`
	}
	document.getElementsByClassName("alerts")[0].innerHTML = alertcode;
	document.getElementsByClassName("alerts")[0].style.display = alertcode == "" ? "none" : "flex";
	$(".alert-short").on("click",function() {openDropdown(this)});
}

async function getJSON(url) {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			return null;
		}
		const json = await response.json();
		return json;
	} catch (error) {
		return null;
	}
}
function selectDay(ele, c) {
	document.getElementsByClassName("selected")[0].classList.remove("selected");
	ele.addClass("selected");
	showWeatherDay(ele.attr("data-number"));
	scrollToDay(ele)
	if (c) return;
	for (let i = 0; i < weatherinfo.hourly.properties.periods.length; i++) {
		if (weatherinfo.hourly.properties.periods[i].startTime == weatherinfo.forecast.properties.periods[ele.attr("data-number")].startTime) {
			selectHour($(document.querySelector(".hour[data-hour-number='" + i + "']")), true)
		}
	}
}
function selectHour(ele, c) {
	document.getElementsByClassName("hour-selected")[0].classList.remove("hour-selected");
	ele.addClass("hour-selected");
	showWeatherHour(ele.attr("data-hour-number"));
	scrollToHour(ele)
	if (c) return;
	let date = new Date(weatherinfo.hourly.properties.periods[ele.attr("data-hour-number")].startTime);
	for (let i = 0; i < weatherinfo.forecast.properties.periods.length; i++) {
		let start = new Date(weatherinfo.forecast.properties.periods[i].startTime);
		let end = new Date(weatherinfo.forecast.properties.periods[i].endTime);
		if (date.valueOf() >= start.valueOf() && date.valueOf() <= end.valueOf()) {
			selectDay($(document.querySelector(".day[data-number='" + i + "']")), true)
		}
	}
}
function showWeatherDay(dayId) {
	let weather = weatherinfo.forecast.properties.periods[dayId];
	did = dayId;
	document.getElementsByClassName("short-desc")[0].innerHTML = weather.shortForecast;
	document.getElementsByClassName("long-desc")[0].innerHTML = weather.detailedForecast;
	document.getElementsByClassName("temperature-number")[0].innerHTML = convertTemps(weather.temperature,"f",unit);
	document.getElementsByClassName("temperature-high-or-low")[0].innerHTML = weather.isDaytime ? "high" : "low";
	document.getElementsByClassName("wind-speed")[0].innerHTML = processWindSpeed(weather.windSpeed);
	document.getElementsByClassName("wind-arrow")[0].style.transform = `rotate(${getDirDegrees(weather.windDirection)}deg)`;
	document.getElementsByClassName("chance-number")[0].innerHTML = weather.probabilityOfPrecipitation.value + "%";
	document.getElementsByClassName("chance-of-precipitation")[0].style.display = weather.probabilityOfPrecipitation.value == null || weather.probabilityOfPrecipitation.value == "null" ? "none" : "flex"
	document.getElementsByClassName("day-info-cards")[0].style.flexWrap = weather.probabilityOfPrecipitation.value == null || weather.probabilityOfPrecipitation.value == "null" ? "wrap" : "wrap"
}
function showWeatherHour(hourId) {
	let weather = weatherinfo.hourly.properties.periods[hourId];
	hid = hourId;
	document.getElementsByClassName("hour-temp")[0].innerHTML = convertTemps(weather.temperature,"f",unit);
	document.getElementsByClassName("hour-cop")[0].innerHTML = weather.probabilityOfPrecipitation.value + "%";
	document.getElementsByClassName("hour-dew")[0].innerHTML = convertTemps(Math.round(weather.dewpoint.value),"c",unit);
	document.getElementsByClassName("hour-humid")[0].innerHTML = weather.relativeHumidity.value + "%";
	document.getElementsByClassName("hour-wind")[0].innerHTML = processWindSpeed(weather.windSpeed);
	document.getElementsByClassName("hour-wind-arrow")[0].style.transform = `rotate(${getDirDegrees(weather.windDirection)}deg)`;
	let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
	let date = (new Date(weather.startTime))
	document.getElementsByClassName("hour-day")[0].innerHTML = months[date.getMonth()] + " " + date.getDate();
	document.getElementsByClassName("hour-hour")[0].innerHTML = `${date.getHours() % 12 == 0 ? 12 : date.getHours() % 12}:00 ${date.getHours() > 12 ? "PM" : "AM"}`;
}
function getDirDegrees(dir) {
	let dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
	return dirs.indexOf(dir) * 22.5;
}
function shiftDays(amt) {
	let div = document.getElementsByClassName("day-container")[0];
	const x = div.scrollLeft + amt * 132
	div.scroll({ left: x, behavior: 'smooth' })
	let percentage = getHorizontalScrollPercentage(div, div.scrollLeft + (amt * 132));
	document.getElementsByClassName("day-container-left-arrow")[0].style.display = percentage < .25 ? "none" : "flex";
	document.getElementsByClassName("day-container-right-arrow")[0].style.display = percentage > 99.75 ? "none" : "flex";
}
function shiftHours(amt) {
	let div = document.getElementsByClassName("hour-container")[0];
	const x = div.scrollLeft + amt * 103
	div.scroll({ left: x, behavior: 'smooth' })
	let percentage = getHorizontalScrollPercentage(div, div.scrollLeft + (amt * 103));
	document.getElementsByClassName("hour-container-left-arrow")[0].style.display = percentage < .25 ? "none" : "flex";
	document.getElementsByClassName("hour-container-right-arrow")[0].style.display = percentage > 99.75 ? "none" : "flex";
}
function scrollToDay(ele) {
	let div = document.getElementsByClassName("day-container")[0];
	const x = ele.offset().left + div.scrollLeft - 142;
	div.scroll({ left: x, behavior: 'smooth' })
	let percentage = getHorizontalScrollPercentage(div, x);
	document.getElementsByClassName("day-container-left-arrow")[0].style.display = percentage < .25 ? "none" : "flex";
	document.getElementsByClassName("day-container-right-arrow")[0].style.display = percentage > 99.75 ? "none" : "flex";
}
function scrollToHour(ele) {
	let div = document.getElementsByClassName("hour-container")[0];
	const x = ele.offset().left + div.scrollLeft - 142;
	div.scroll({ left: x, behavior: 'smooth' })
	let percentage = getHorizontalScrollPercentage(div, x);
	document.getElementsByClassName("hour-container-left-arrow")[0].style.display = percentage < .25 ? "none" : "flex";
	document.getElementsByClassName("hour-container-right-arrow")[0].style.display = percentage > 99.75 ? "none" : "flex";
}
function getHorizontalScrollPercentage(div, newleft) {
	const scrollWidth = div.scrollWidth - div.clientWidth;

	return (newleft / scrollWidth) * 100;
}
function convertTemps(v,f,t) {
	let c = v;
	if (f == "f") c = (v - 32) * (5 / 9);
	if (f == "k") c = v - 273.15;
	if (f == "r") c = (v - 491.67) * (5 / 9);
	if (f == "d") c = (100 - (v * (2/3)));
	if (f == "re") c = 1.25 * v;
	if (f == "ro") c = (v - 7.5) * (40 / 21);
	if (t == "c") return Math.round(c) + "°C"; //Celsius
	if (t == "f") return Math.round(c * (9 / 5) + 32) + "°F"; //Farhenheit (or however you spell it)
	if (t == "k") return Math.round(c + 273.15) + " K"; //Kelvin
	if (t == "r") return Math.round(c * (9 / 5) + 491.67) + "°R"; //Rankine
	if (t == "d") return Math.round((100 - c) * (3/2)) + "°De"; //Delisle
	if (t == "re") return Math.round(0.8 * c) + "°Ré"; //Réaumur
	if (t == "ro") return Math.round((21 / 40) * c + 7.5) + "°Rø"; //Rømer
}
function convertSpeed(v,f,t,u) {
	let mps = v;
	if (f == "mph") mps = v / 2.237;
	if (f == "kph") mps = v / 3.6;
	if (f == "lpm") mps = v / 0.00000333368;
	if (f == "k") mps = v / 1.944;
	if (f == "fps") mps = v / 3.281;
	if (t == "mps") return Math.round(mps) + (u ? "" : " m/s");
	if (t == "mph") return Math.round(mps * 2.237) +  (u ? "" : " mph");
	if (t == "kph") return Math.round(mps * 3.6) +  (u ? "" : " km/h");
	if (t == "lpm") return (mps * 0.00000333368) + (u ? "" : " lpm");
	if (t == "k") return Math.round(mps * 1.944) +  (u ? "" : " knots");
	if (t == "fps") return Math.round(mps * 3.281) +  (u ? "" : " fps");
}
function processWindSpeed(s) {
	let split = s.split(" ");
	if (split.length == 2) {
		return convertSpeed(split[0] - 0,"mph",sunit);
	} else if (split.length == 4) {
		return convertSpeed(split[0] - 0,"mph",sunit,true) + " to " + convertSpeed(split[2] - 0,"mph",sunit);
	}
}