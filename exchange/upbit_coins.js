function coin_list() {
  const url = `https://crix-api-endpoint.upbit.com/v1/crix/trends/acc_trade_price_24h?includeNonactive=false&codeOnly=true`;
  d3.json(url, function(error, data) {
    codes = []
    for (i in data) {
      if (data[i].includes('KRW')) {
        code = data[i].split('.')[2];
        codes.push(code);
      }
    }
    console.log(codes);
    display_coins(codes);
  }); 
}

function display_coins(codes) {
  var parents = document.getElementsByName('chart');
  var charts = [];
  for (var i = 0; i < parents.length; i++) {
    var chart = new FinanceChart(parents[i])
    charts.push(chart);
  }
  // chart.init();
  // get_stock('KR7178780003', charts[0])
  var charts_refresh = []
  for (var i = 0; i < charts.length; i++) {
    charts_refresh.push(get_coin(codes[i], period_option, charts[i]));  
    charts[i].click_link(`upbit_chart.html?code=${codes[i]}`);
    charts[i].ema_options(ema_options);
  }
  // chart.ohlc([{'date':'2018-01-01 00:00:00.0', 'openingPrice':'10', 'high': 100, low:1, close:50, volume: 5000},
  //             {'date':'2018-01-02 00:00:00.0', 'openingPrice':'10', 'high': 100, low:1, close:50, volume: 5000}])
  // chart.draw();
  
  function refreshData() {
    charts_refresh.forEach((f) => f());
    setTimeout(refreshData, refresh_option*1000);  
  }
  
  refreshData();
}

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

var ema = findGetParameter('ema');
var ema_options = [10,30,90];
if (ema) {
  ema_options = ema.split(',').map(Number);
}

var period = findGetParameter('period');
var period_option = 'ticks/60';
if (period) {
  period_option = period;
}

var refresh = findGetParameter('refresh');
var refresh_option = 10;
if (refresh) {
  refresh_option = refresh;
}

coin_list();
