const PERIODS = ['days', 'weeks', 'months', 'ticks/60', 'minutes/1', 'minutes/3', 'minutes/5', 'minutes/10', 
                'minutes/15', 'minutes/30', 'minutes/45', 'minutes/60'];
console.log('periods:', PERIODS);

var selected_stock;

var all_stocks = []

function search_stock() {
  const stock_search = document.getElementById('stock_search');
  filtered_stocks = all_stocks.filter((d) => d.name.includes(stock_search.value.trim()))
  display_stock_codes(filtered_stocks);
}

d3.select('#stock_search').on('keydown', (d) => search_stock());

d3.select('#buttons').selectAll('button').data(PERIODS).enter().append('button').text((d) => d).on('click',(d)=>display_stock(selected_stock, d));

const stocks_url = `http://stock.kakao.com/api/trends/ordered_stocks.json?key=top_rate_of_rise&market=kosdaq&limit=100`;

function display_stock_codes(codes) {
  var stocks = d3.select('#stocks').selectAll('a').data(codes.slice(0, 50))
  stocks.exit().remove()
  stocks.enter().append('a').attr('class', 'panel-block').text((d) => d.name).on('click', (d)=>selected_stock=d);
}


function coin_list(limit) {
  d3.json(stocks_url, function(error, data) {
    var nextCursor = data.nextCursor;
    data = data.stocks;
    all_stocks = data.map((d) => {
      return {
        name: d.name,
        shortCode: d.shortCode,
        code: d.code
      }
    });

    display_stock_codes(all_stocks.slice(0, 50));

    var count = 0;
    next_coin_list(nextCursor);
    // for (var i = 0; i < data.length; i++) {
    //   var symbol = data[i].symbol;
    //   var currency = symbol.substr(symbol.length-3);
    //   var coin = symbol.substr(0, symbol.length-3)
    //   if (['ETH'].includes(currency)) {
    //     codes.push(symbol)
    //   }
    // }
    // display_coins(codes.slice(0,12));

  }); 
}

function next_coin_list(nextCursor) {
  if (nextCursor) {
    d3.json(`${stocks_url}&cursor=${nextCursor}`, function(error, data) {
      var nextCursor = data.nextCursor;
      data = data.stocks;
      data = data.map((d) => {
        return {
          name: d.name,
          shortCode: d.shortCode,
          code: d.code
        }
      })
      all_stocks = all_stocks.concat(data);

      next_coin_list(nextCursor);
    });
    
  } else {
    console.log('stocks:', all_stocks);
  }
}

var charts_refresh = [];

function remove_chart(chart, index) {
  charts_refresh.splice(index, 1);
  chart.parent.remove();
  
}

function display_stock(stock, period) {
  var parent = d3.select('#chart_columns').append('div').attr('class', 'column is-half-desktop').node();
  var chart = new FinanceChart(parent);
  if (ema_options) {
    chart.ema_options(ema_options);
  }
  chart.symbol_text(stock.name + ' ' + period);
  charts_refresh.push(get_coin(stock, period, chart));
  var index = charts_refresh.length-1;
  chart.click_link(()=>remove_chart(chart, index));
  // chart.click_link(`kosdaq_chart.html?code=${codes[i].code}`);

  function refreshData() {
    charts_refresh.forEach((f) => f());
    // setTimeout(refreshData, refresh_option*1000);  
  }
  
  refreshData();
}

function get_coin(stock, period, chart) {  
  chart.mapper({
    dateFormat: '%Y-%m-%d %H:%M:%S.%L',
    date:'candleTime', 
    open:'openingPrice',
    high: 'highPrice',
    low: 'lowPrice',
    close: 'tradePrice',
    volume: 'candleAccTradeVolume'
  });

  const url = `http://quotation-api.dunamu.com/v1/candle/${period}?count=400&code=${stock.code}`;
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
  ema_options = ema.split(',').map(Number)
}

var period = findGetParameter('period');
var period_option = 'minutes/5';
if (period) {
  period_option = period;
}

var refresh = findGetParameter('refresh');
var refresh_option = 10;
if (refresh) {
  refresh_option = refresh;
}

var coins = findGetParameter('stocks');
if (coins) {
  var coin_arr = coins.split(',')
  console.log(coin_arr)
  display_coins(coin_arr);
} else {
  var limit = findGetParameter('limit');
  coin_list(limit);
}

