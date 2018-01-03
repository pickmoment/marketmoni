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
  return 'N/A'
})

Vue.component('coin-view', {
  props: ['coin'],
  template: `
    <div class="col s6 m3 l2">
      <div class="card">
        <div class="card-content">
          <span class="card-title" v-bind:title="coin.name">
            {{coin.symbol}} <span class="card-title-desc">{{coin.name}}</span>
          </span>
          <div class="row">
            <index-view title="현재가" v-bind:index="coin.price" unit="원" wide="s6"/>
            <index-view title="프리미엄" v-bind:index="coin.premium" unit="%" wide="s6"/>
            <index-view title="1일" v-bind:index="coin.change" unit="%" wide="s4"/>
            <index-view title="5분" v-bind:index="coin.change_5" unit="%" wide="s4"/>
            <index-view title="15분" v-bind:index="coin.change_15" unit="%" wide="s4"/>
            <index-view title="30분" v-bind:index="coin.change_30" unit="%" wide="s4"/>
            <index-view title="60분" v-bind:index="coin.change_60" unit="%" wide="s4"/>
            <index-view title="120분" v-bind:index="coin.change_120" unit="%" wide="s4"/>
            <index-view title="거래량" v-bind:index="coin.amount" unit="개" wide="s6"/>
            <index-view title="거래금액" v-bind:index="coin.volume" unit="원" wide="s6"/>
            <index-view title="구매강도" v-bind:index="coin.bid_power" unit="배" wide="s6"/>
          </div>
        </div>            
        <div class="card-action">
          <a v-bind:href="coin.coinmarketcap_link" target="_blank">Global</a>
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

DATA_MAX = 120

symbol_map = {
  'BCC': 'BCH'
}

findSymbol = function(symbol) {
  if (symbol in symbol_map) {
    return symbol_map[symbol]
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
      data_coin: TAFFY(),
      data_coinmarketcap: TAFFY(),
      filter_name: ''
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
        // this.data_coin.length = 0
        tickers = res.body
        // tick_list = []
        // console.log(data_coinmarketcap)
        for (i in tickers) {
          ticker = tickers[i]
          code_part = ticker.code.split('.')
          code_part = code_part[2].split('-')
          market = code_part[0]
          symbol = code_part[1]

          if (market === 'KRW') {
            coinmarket = this.data_coinmarketcap({symbol: findSymbol(symbol)}).first()
            coin_name = coinmarket.name
            coin_name_code = coin_name.replace(' ', '-')
            coin_name_code = coin_name_code.toLowerCase()
            ticker.volume = Math.round(ticker.tradePrice * ticker.tradeVolume)
            // console.log(data_coinmarketcap[findSymbol(symbol)])
            ticker.premium = ((ticker.tradePrice / coinmarket.price - 1) * 100).toFixed(2)
            ticker.coinmarketcap_link = `https://coinmarketcap.com/currencies/${coin_name_code}/#markets`
            // tick_list.push(ticker)

            new_data = {
              id: `${symbol}_${ticker.tradeTimestamp}`,
              symbol: symbol,
              name: coin_name,
              price: ticker.tradePrice,
              premium: ticker.premium,
              amount: ticker.tradeVolume.toFixed(5),
              volume: ticker.volume,
              timestamp: ticker.tradeTimestamp,
              // prev_price: ticker.prevClosingPrice,
              change: (ticker.signedChangeRate * 100).toFixed(2),
              bid_power: (ticker.accBidVolume / ticker.accAskVolume).toFixed(2),
              coinmarketcap_link: ticker.coinmarketcap_link
            }
            
            this.data_coin.merge(new_data)
            
            console.log(this.data_coin({symbol:'ADA'}).get())
          }
        }
        this.displayCoinData()
      }, err => {
        console.log(err)
      })
      
      
    },

    fetchCoinMarketCap() {
      this.$http.get('https://api.coinmarketcap.com/v1/ticker/?convert=KRW&limit=300').then(res => {
        tickers = res.body
        // console.log(tickers)

        this.data_coinmarketcap().remove()

        for (i in tickers) {
          ticker = tickers[i]
          this.data_coinmarketcap.insert({
            symbol: ticker.symbol,
            name: ticker.name,
            price: Math.round(ticker.price_krw),
            volume: Math.round(ticker['24h_volume_krw'] / 100000000),
            market_cap: Math.round(ticker.market_cap_krw / 100000000),
            market_supply: (ticker.available_supply / 100000000).toFixed(3),
            change_1h: ticker.percent_change_1h,
            change_1d: ticker.percent_change_24h,
            change_7d: ticker.percent_change_7d
          })
        }

        this.fetchCoinList()
      }, err => {
        console.log(err)
      })

    },

    cancelAutoUpdate() { 
      clearInterval(this.timer) 
      clearInterval(this.timer_coinmarketcap)
    },

    filterCoin(e) {
      this.filter_name = e.target.value
      this.displayCoinData();
      
    },

    displayCoinData() {
      this.coinList = []
      for (key in this.data_coin) {
        filterName = this.filter_name.toUpperCase()
        coinName = this.data_coin[key][0].name.toUpperCase()

        if (key.search(filterName) >= 0
            || coinName.search(filterName) >=0) {
          d = this.data_coin[key]
          // console.log(d)
          this.coinList.push(d[d.length-1])
        }
      }
      // console.log(this.coinList)
      if (this.coinList[0]) {
        this.updateTime = this.coinList[0].timestamp
      }
    }
  },
  beforeDestroy() {
    clearInterval(this.timer)
    clearInterval(this.timer_coinmarketcap)
  }

})
