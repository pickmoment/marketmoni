function get_coin(code, period, chart) {
  chart.mapper({
    dateFormat: '%Y-%m-%dT%H:%M:%S%Z',
    date:'candleDateTimeKst', 
    open:'openingPrice',
    high: 'highPrice',
    low: 'lowPrice',
    close: 'tradePrice',
    volume: 'candleAccTradeVolume'
  });
  chart.symbol_text(code + ' ' + period);
  
  const url = `https://crix-api-endpoint.upbit.com/v1/crix/candles/${period}?count=200&code=CRIX.UPBIT.${code}`;
  return function() {
    d3.json(url, function(error, data) {
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

var parents = document.getElementsByName('chart');
var charts = [];
for (var i = 0; i < parents.length; i++) {
  var chart = new FinanceChart(parents[i])
  charts.push(chart);
}
// chart.init();
// get_stock('KR7178780003', charts[0])
var charts_refresh = []
var periods = ['ticks/60', 'minutes/1', 'minutes/3', 'minutes/5', 'minutes/10', 
                'minutes/15', 'minutes/30', 'minutes/60', 'minutes/240', 'days'];
var date_format = ['%H:%M:%S', '%d %H:%M', '%d %H:%M', '%d %H:%M', '%d %H:%M', 
                '%d %H:%M', '%d %H:%M', '%m/%d %H', '%m/%d %H', '%y/%m/%d'];
for (var i = 0; i < periods.length; i++) {
  charts_refresh.push(get_coin(code, periods[i], charts[i]));
  charts[i].date_format(date_format[i])
  if (ema_options) {
    charts[i].ema_options(ema_options);
  }
}

// chart.ohlc([{'date':'2018-01-01 00:00:00.0', 'openingPrice':'10', 'high': 100, low:1, close:50, volume: 5000},
//             {'date':'2018-01-02 00:00:00.0', 'openingPrice':'10', 'high': 100, low:1, close:50, volume: 5000}])
// chart.draw();

function refreshData() {
  charts_refresh.forEach((f) => f());
  setTimeout(refreshData, refresh_option*1000);  
}

refreshData();