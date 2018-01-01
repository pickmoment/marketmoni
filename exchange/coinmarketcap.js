Vue.filter('formatDate', function(value) {
  if (value) {
    return moment(value).format('YYYY/MM/DD HH:mm')
  }
})

Vue.filter('currency', function(value) {
  if (value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
            <index-view title="총액" v-bind:index="coin.market_cap" unit="억원" wide="s6"/>
            <index-view title="발행량" v-bind:index="coin.market_supply" unit="억개" wide="s6"/>
            <index-view title="현재가" v-bind:index="coin.price" unit="원" wide="s6"/>
            <index-view title="거래량[24h]" v-bind:index="coin.volume" unit="억원" wide="s6"/>
            <index-view title="증가율[1h]" v-bind:index="coin.change_1h" unit="%" wide="s4"/>
            <index-view title="증가율[1d]" v-bind:index="coin.change_1d" unit="%" wide="s4"/>
            <index-view title="증가율[7d]" v-bind:index="coin.change_7d" unit="%" wide="s4"/>
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


var app = new Vue({
  el: '#app',
  data() {
    return {
      coinList: [],
      updateTime: '',
      timer: ''
    }
  },
  created: function() {
    this.fetchCoinList();
    this.timer = setInterval(this.fetchCoinList, 60000)
  },
  methods: {
    fetchCoinList() {
      // this.$http.get('data.json').then(res => {
      //   this.coinList = res.body
      //   this.updateTime = moment()
      // }, err => {
      //   console.log(err)
      // })

      this.$http.get('https://api.coinmarketcap.com/v1/ticker/?convert=KRW&limit=100').then(res => {
        coinList = []
        tickers = res.body
        console.log(tickers)
        for (i in tickers) {
          ticker = tickers[i]
          coinList.push({
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
        this.coinList = coinList
        this.updateTime = moment()
      }, err => {
        console.log(err)
      })
      
      
    },
    cancelAutoUpdate() { clearInterval(this.timer) }
  },
  beforeDestroy() {
    clearInterval(this.timer)
  }

})
