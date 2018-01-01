Vue.filter('formatDate', function(value) {
  if (value) {
    return moment(value).format('YYYY/MM/DD HH:mm')
  }
})

Vue.filter('currency', function(value) {
  if (value) {
    parts = value.toString().split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return parts.join('.');
  }
  return 0
})

Vue.component('coin-view', {
  props: ['coin'],
  template: `
    <div class="col s6 m3 l2">
      <div class="card">
        <div class="card-content">
          <span class="card-title" v-bind:title="coin.name">
            {{coin.symbol}}
          </span>
          <div class="row">
            <index-view title="현재가" v-bind:index="coin.price" unit="원" wide="s6"/>
            <index-view title="프리미엄" v-bind:index="coin.premium" unit="%" wide="s6"/>
            <index-view title="증가량" v-bind:index="coin.change" unit="%" wide="s6"/>
            <index-view title="증가액" v-bind:index="coin.change_price" unit="%" wide="s6"/>
            <index-view title="거래량" v-bind:index="coin.amount" unit="개" wide="s6"/>
            <index-view title="거래금액" v-bind:index="coin.volume" unit="원" wide="s6"/>
            <index-view title="구매강도" v-bind:index="coin.bid_power" unit="배" wide="s6"/>
            </div>
        </div>            
      </div>
    </div>  
  `        
})

Vue.component('index-view', {
  props: ['title', 'index', 'unit', 'wide'],
  template: `
    <div v-bind:class="['col', wide, 'index']">
      <div class="index-title">{{title}} ({{unit}})</div>
      <span>{{index | currency}} </span>
    </span>
  `
})

data_coinmarketcap = {}

findSymbol = function(symbol) {
  if (symbol === 'BCC') {
    return 'BCH'
  }
  return symbol
}

var app = new Vue({
  el: '#app',
  data() {
    return {
      coinList: [],
      updateTime: '',
      timer: '',
      timer_coinmarketcap: '',
    }
  },
  created: function() {
    this.fetchCoinMarketCap();
    this.timer = setInterval(this.fetchCoinList, 10000)
    this.timer_coinmarketcap = setInterval(this.fetchCoinMarketCap, 240000)
  },
  methods: {
    fetchCoinList() {
      this.$http.get('http://crix-api-endpoint.upbit.com/v1/crix/trends/acc_trade_price_24h?includeNonactive=false').then(res => {
        coinList = []
        tickers = res.body
        tick_list = []
        // console.log(data_coinmarketcap)
        for (i in tickers) {
          ticker = tickers[i]
          code_part = ticker.code.split('.')
          code_part = code_part[2].split('-')
          market = code_part[0]
          symbol = code_part[1]

          if (market === 'KRW') {
            ticker.volume = Math.round(ticker.tradePrice * ticker.tradeVolume)
            // console.log(data_coinmarketcap[findSymbol(symbol)])
            ticker.premium = ((ticker.tradePrice / data_coinmarketcap[findSymbol(symbol)].price - 1) * 100).toFixed(2)
            tick_list.push(ticker)

            coinList.push({
              symbol: symbol,
              name: data_coinmarketcap[findSymbol(symbol)].name,
              price: ticker.tradePrice,
              premium: ticker.premium,
              amount: ticker.tradeVolume.toFixed(5),
              volume: ticker.volume,
              timestamp: ticker.tradeTimestamp,
              // prev_price: ticker.prevClosingPrice,
              change_price: ticker.signedChangePrice,
              change: (ticker.signedChangeRate * 100).toFixed(2),
              bid_power: (ticker.accBidVolume / ticker.accAskVolume).toFixed(2)
            })
          }
        }
        // console.log(tick_list)
        this.coinList = coinList
        this.updateTime = coinList[0].timestamp
      }, err => {
        console.log(err)
      })
      
      
    },

    fetchCoinMarketCap() {
      this.$http.get('https://api.coinmarketcap.com/v1/ticker/?convert=KRW&limit=300').then(res => {
        tickers = res.body
        // console.log(tickers)
        for (i in tickers) {
          ticker = tickers[i]
          data_coinmarketcap[ticker.symbol] = {
            symbol: ticker.symbol,
            name: ticker.name,
            price: Math.round(ticker.price_krw),
            volume: Math.round(ticker['24h_volume_krw'] / 100000000),
            market_cap: Math.round(ticker.market_cap_krw / 100000000),
            market_supply: (ticker.available_supply / 100000000).toFixed(3),
            change_1h: ticker.percent_change_1h,
            change_1d: ticker.percent_change_24h,
            change_7d: ticker.percent_change_7d
          }
        }
        this.fetchCoinList()
      }, err => {
        console.log(err)
      })

    },

    cancelAutoUpdate() { 
      clearInterval(this.timer) 
      clearInterval(this.timer_coinmarketcap)
    }
  },
  beforeDestroy() {
    clearInterval(this.timer)
    clearInterval(this.timer_coinmarketcap)
  }

})
