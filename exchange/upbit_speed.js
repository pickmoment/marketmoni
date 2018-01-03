Vue.filter('formatDate', function(value) {
  if (value) {
    return moment(value).format('YYYY/MM/DD HH:mm:ss')
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

Vue.component('coin-board', {
  props: ['coins'],
  template: `
    <table>
    <thead>
      <tr>
        <th>코인</th>
        <th>프리미엄</th>
        <th>현재가</th>
        <th>1일 %</th>
        <th>최소 %</th>
        <th>중간 %</th>
        <th>최대 %</th>
        <th>초당Tick</th>
        <th>Bid율</th>
        <th>초당Volume</th>
      </tr>
    </thead>
    <tbody>
      <coin-view 
        v-for="coin in coins"
        v-bind:coin="coin"
        v-bind:key="coin.symbol">
      </coin-view>
    </tbody>
  </table>
`        
})

Vue.component('coin-view', {
  props: ['coin'],
  template: `
    <tr>
      <td>{{coin.symbol}} <a v-bind:href="coin.coinmarketcap_link" target="_blank">({{coin.name}})</a></td>
      <td>{{coin.premium | currency}}</td>
      <td>{{coin.price | currency}}</td>
      <td>{{coin.chnage_1d | currency}}</td>
      <td>{{coin.change_min | currency}}</td>
      <td>{{coin.change_median | currency}}</td>
      <td>{{coin.change_max | currency}}</td>
      <td>{{coin.speed | currency}}</td>
      <td>{{coin.bidrate | currency}}</td>
      <td>{{coin.volume_speed | currency}}</td>
    </tr> 
  `        
})

TICK_COUNT = 500

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
      coinCodes: [],
      coinList: [],
      updateTime: '',
      timer: '',
      timer_coinmarketcap: '',
      data_coin: {},
      data_coinmarketcap: {},
      filter_name: ''
    }
  },
  created: function() {
    this.fetchCoinList()
  },
  methods: {
    fetchCoinList() {
      this.$http.get('https://crix-api-endpoint.upbit.com/v1/crix/trends/acc_trade_price_24h?includeNonactive=false&codeOnly=true').then(res => {
        codes = res.body
        for (i in codes) {
          code = codes[i]
          code_part = code.split('.')
          code_part = code_part[2].split('-')
          market = code_part[0]
          symbol = code_part[1]
          
          if (market === 'KRW') {
            this.coinCodes.push(symbol)
          }
        }

        this.fetchCoinMarketCap();
        this.timer_coinmarketcap = setInterval(this.fetchCoinMarketCap, 240000)
            
      }, err => {
        console.log(err)
      })
    },

    fetchCoinTicks() {
      // coins = ['SNT','XLM','BTC','XRP','ADA','STEEM','QTUM','POWR','ETH','BCC','EMC2','MER']
      // coins = ['SNT']
      // console.log('tick', this.coinCodes)
      for (i in this.coinCodes) {
        coin = this.coinCodes[i]
        this.$http.get(`https://crix-api-endpoint.upbit.com/v1/crix/trades/ticks?code=CRIX.UPBIT.KRW-${coin}&count=${TICK_COUNT}`).then(res => {
        // this.data_coin.length = 0
        tickers = res.body
        // tick_list = []
        // console.log(data_coinmarketcap)
        if (tickers && tickers.length > 0) {
          ticker = tickers[0]
          code_part = ticker.code.split('.')
          code_part = code_part[2].split('-')
          market = code_part[0]
          symbol = code_part[1]

          if (market === 'KRW') {
            coinmarket = this.data_coinmarketcap[findSymbol(symbol)]
            coin_name = coinmarket.name
            coin_name_code = coin_name.replace(' ', '-')
            coin_name_code = coin_name_code.toLowerCase()
            ticker.premium = ((ticker.tradePrice / coinmarket.price - 1) * 100).toFixed(2)
            ticker.coinmarketcap_link = `https://coinmarketcap.com/currencies/${coin_name_code}/#markets`
            ticker.seconds = ((ticker.tradeTimestamp - tickers[tickers.length-1].tradeTimestamp) / 1000)
            ticker.speed = (TICK_COUNT / ticker.seconds).toFixed(2)
            ticker.bidrate = (tickers.filter(t => t.askBid === 'BID').length / TICK_COUNT * 100).toFixed(2)

            let tradePrices = tickers.slice(1).map(t => t.tradePrice)
            tradePrices.sort((a, b) => a - b)
            // let sum_tradePrice = tradePrices.reduce((previous, current) => current += previous);
            // let avg_tradePrice = sum_tradePrice / tradePrices.length
            let median_tradePrice = (tradePrices[(tradePrices.length - 1) >> 1] + tradePrices[tradePrices.length >> 1]) / 2
            let max_tradePrice = tradePrices[tradePrices.length-1]
            let min_tradePrice = tradePrices[0]

            // let avg_change = ((ticker.tradePrice / avg_tradePrice - 1) * 100).toFixed(2)
            let change_median = ((ticker.tradePrice / median_tradePrice - 1) * 100).toFixed(2)
            let change_max = ((ticker.tradePrice / max_tradePrice - 1) * 100).toFixed(2)
            let change_min = ((ticker.tradePrice / min_tradePrice - 1) * 100).toFixed(2)
            // let change_1d = (Number(ticker.signedChangeRate) * 100).toFixed(2)
            let change_1d = ((ticker.tradePrice / ticker.prevClosingPrice - 1) * 100).toFixed(2)

            let tradeVolumes = tickers.map(t => t.tradeVolume).reduce((a, b) => b += a)
            let volume_speed = tradeVolumes / ticker.seconds

            console.log(symbol, coin_name, ticker.premium, ticker.tradePrice, 
              change_1d, change_min, change_median, change_max, 
              tickers.length, ticker.seconds, ticker.speed, ticker.bidrate, volume_speed)

            new_data = {
              symbol: symbol,
              name: coin_name,
              premium: ticker.premium,
              price: ticker.tradePrice,
              chnage_1d: change_1d,
              change_min: change_min,
              change_median: change_median,
              change_max: change_max,
              speed: ticker.speed,
              bidrate: ticker.bidrate,
              volume_speed: volume_speed,
              timestamp: ticker.tradeTimestamp,
              coinmarketcap_link: ticker.coinmarketcap_link
            }
            
            this.data_coin[symbol] = new_data
          }
        }
        this.displayCoinData()
      }, err => {
        console.log(err)
      })
    }
      
    },

    fetchCoinMarketCap() {
      this.$http.get('https://api.coinmarketcap.com/v1/ticker/?convert=KRW&limit=300').then(res => {
        tickers = res.body

        this.data_coinmarketcap = {}

        for (i in tickers) {
          ticker = tickers[i]
          this.data_coinmarketcap[ticker.symbol] = {
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

        if (!this.timer) {
          this.fetchCoinTicks()
          this.timer = setInterval(this.fetchCoinTicks, 10000)
        }
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
        coinName = this.data_coin[key].name.toUpperCase()

        if (key.search(filterName) >= 0
            || coinName.search(filterName) >=0) {
          this.coinList.push(this.data_coin[key])
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
