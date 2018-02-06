const PERIODS = ['1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w','1M'];
console.log('periods:', PERIODS);4
function get_coin(code, period, chart) {
  chart.symbol_text(code + ' ' + period);
  
  const url = `https://api.binance.com/api/v1/klines?symbol=${code}&interval=${period}`;
  return function() {
    d3.json(url, function(error, data) {
      data = data.map(function(d) {
        return {
          date: d[0],
          open: d[1],
          high: d[2],
          low: d[3],
          close: d[4],
          volume: d[5]
        }
      })
      chart.ohlc(data)
      chart.draw();
    }); 
  }

}

function findGetParameter(parameterName) {
  var result = null,
      tmp = [];
  var items = location.search.substr(1).split("&");
  for (var index = 0; index < items.length; index++) {
      tmp = items[index].split("=");
      if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
  }
  return result;
}            

var code = findGetParameter('code');
var ema = findGetParameter('ema');
var ema_options = [10,30,90];
if (ema) {
  ema_options = ema.split(',').map(Number);
}

var refresh = findGetParameter('refresh');
var refresh_option = 10;
if (refresh) {
  refresh_option = refresh;
}

var period_arr = ['1m', '5m', '15m', '30m', '1h', '4h', '8h', '1d'];
var periods = findGetParameter('periods');
if (periods) {
  period_arr = periods.split(',');
}

var charts_refresh = []
var date_format = {'1m':'%d %H:%M', '3m':'%d %H:%M', '5m':'%d %H:%M', '15m':'%d %H:%M', '30m':'%d %H:%M',
                   '1h':'%m/%d %H', '2h':'%m/%d %H', '4h':'%m/%d %H', '6h':'%m/%d %H', '8h':'%m/%d %H', '12h':'%m/%d %H', 
                   '1d':'%y/%m/%d', '3d':'%y/%m/%d', '1w':'%y/%m/%d', '1M':'%y/%m'};
for (var i = 0; i < period_arr.length; i++) {
  var parent = d3.select('#chart_columns').append('div').attr('class', 'column is-half-desktop').node();
  var chart = new FinanceChart(parent);
  chart.date_format(date_format[period_arr[i]])
  if (ema_options) {
    chart.ema_options(ema_options);
  }
  charts_refresh.push(get_coin(code, period_arr[i], chart));

}

function refreshData() {
  charts_refresh.forEach((f) => f());
  setTimeout(refreshData, refresh_option*1000);  
}

refreshData();