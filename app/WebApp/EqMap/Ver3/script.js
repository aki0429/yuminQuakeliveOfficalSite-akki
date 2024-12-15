//マップ関連
var map = L.map('map',{zoomControl: false}).setView([38.333039, 140.26570], 6);
var PolygonLayer_Style_nerv = {
    "color": "#ffffff",
    "weight": 1.5,
    "opacity": 1,
    "fillColor": "#454545",
    "fillOpacity": 1
}
//マップ背景
$.getJSON("prefectures.geojson", function (data) {
    L.geoJson(data, {
        style: PolygonLayer_Style_nerv
    }).addTo(map);
});
//地震情報
//ボタン押下時のイベント設定とローカルストレージの設定
document.getElementById('reload').addEventListener("click",()=>{
    if (document.getElementById('reload_num').value != "") {
        if (document.getElementById('reload_num').value > 100 || document.getElementById('reload_num').value <= 0) {
            GetQuake(100);
        } else {
            GetQuake(document.getElementById('reload_num').value);
        }
    } else {
        GetQuake();
    }
    document.getElementById('reload').innerText = "更新中…";
    setTimeout(() => {
        document.getElementById('reload').innerText = "更新完了";
        setTimeout(() => {
            document.getElementById('reload').innerText = "情報更新";
        }, 1000);
    }, 1000);
});

GetQuake();

function GetQuake(option) {
    var url;
    if (!isNaN(option)) {
        url = "https://api.p2pquake.net/v2/history?codes=551&limit="+option;
    } else {
        url = "https://api.p2pquake.net/v2/history?codes=551&limit=20";
    }
    $.getJSON(url, function (data) {
    //地震情報の処理
    var [time, name, shindo, magnitude, depth] = [
        data["0"]["earthquake"]["time"],
        data["0"]["earthquake"]["hypocenter"]["name"],
        data["0"]["earthquake"]["maxScale"],
        data["0"]["earthquake"]["hypocenter"]["magnitude"],
        data["0"]["earthquake"]["hypocenter"]["depth"]
    ]
    //震源にバツ印のピンを配置
    var shingenLatLng = new L.LatLng(data[0]["earthquake"]["hypocenter"]["latitude"], data[0]["earthquake"]["hypocenter"]["longitude"]);
    var shingenIconImage = L.icon({
        iconUrl: 'imges/shingen.png',
        iconSize: [40,40],
        iconAnchor: [20, 20],
        popupAnchor: [0,-40]
        });
        var shingenIcon = L.marker(shingenLatLng, {icon: shingenIconImage }).addTo(map);
    //地震情報の変換
        let maxInt_data = data[0]['earthquake']['maxScale'];
    var maxIntText = maxInt_data == 10 ? "1" : maxInt_data == 20 ? "2" : maxInt_data == 30 ? "3" : maxInt_data == 40 ? "4" :
                     maxInt_data == 45 ? "5弱" : maxInt_data == 46 ? "5弱" : maxInt_data == 50 ? "5強" : maxInt_data == 55 ? "6弱" :
                     maxInt_data == 60 ? "6強" : maxInt_data == 70 ? "7" : "不明";
    
    var Magnitude = data[0]['earthquake']['hypocenter']['magnitude'] != -1 ?
                    (data[0]['earthquake']['hypocenter']['magnitude']).toFixed(1) : 'ー.ー';
    var Name = data[0]['earthquake']['hypocenter']['name'] != "" ?
               data[0]['earthquake']['hypocenter']['name'] : '情報なし';
    var Depth = data[0]['earthquake']['hypocenter']['depth'] != -1 ?
                "約"+data[0]['earthquake']['hypocenter']['depth']+"km" : '不明';
    var tsunamiText = data[0]['earthquake']['domesticTsunami'] == "None" ? "津波の心配はありません。" :
                      data[0]['earthquake']['domesticTsunami'] == "Unknown" ? "不明" :
                      data[0]['earthquake']['domesticTsunami'] == "Checking" ? "気象庁で調査中" :
                      data[0]['earthquake']['domesticTsunami'] == "NonEffective" ? "若干の海面変動" :
                      data[0]['earthquake']['domesticTsunami'] == "Watch" ? "津波注意報" :
                      data[0]['earthquake']['domesticTsunami'] == "Warning" ? "大津波警報・津波警報" : "情報なし";
    var Time = data[0]['earthquake']['time'];
    //震源ポップアップ
    shingenIcon.bindPopup('発生時刻：'+Time+'<br>最大震度：'+maxIntText+'<br>震源地：'+Name+'<span style=\"font-size: 85%;\"> ('+data[0]["earthquake"]["hypocenter"]["latitude"]+", "+data[0]["earthquake"]["hypocenter"]["longitude"]+')</span><br>規模：M'+Magnitude+'　深さ：'+Depth+'<br>受信：'+data[0]['issue']['time']+', '+data[0]['issue']['source'],{closeButton: false, zIndexOffset: 10000, maxWidth: 10000});
    shingenIcon.on('mouseover', function (e) {this.openPopup();});
    shingenIcon.on('mouseout', function (e) {this.closePopup();});
    map.flyTo(shingenLatLng, 7.5, { duration: 0.5 })

    //サイドバーの情報関連
    var info = ""+data[0]["issue"]["time"]+""
    document.getElementById('eqrece').innerText = info;

    var info = ""+data[0]["earthquake"]["time"]+""
    document.getElementById('eqtime').innerText = info;

    var info = ""+maxIntText+""
    document.getElementById('eqmint').innerText = info;

    var info = ""+Name+""
    document.getElementById('eqepic').innerText = info;
    
    var info = ""+Magnitude+""
    document.getElementById('eqmagn').innerText = info;

    var info = ""+Depth+""
    document.getElementById('eqdepth').innerText = info;

    var info = ""+tsunamiText+""
    document.getElementById('eqtsunami').innerText = info;

    //スマホ表示
    var info = "発生時刻："+data[0]["earthquake"]["time"]+"\n震源地："+Name+"\nマグニチュード："+Magnitude+"\n深さ："+Depth+"\n最大震度："+maxIntText+"\n"+tsunamiText+""
    document.getElementById('sp_eqinfo').innerText = info;

    //観測点関係
    var JMAPointsJson;
    //観測点の位置データなどのデータを取得
    async function GetJson() {
        const url = "JMAstations.json";
        const response = await fetch(url)
            .then(response => response.json())
            .then(data => {
                JMAPointsJson = data;
                drawPoints();
            });
    }
    GetJson();

    function drawPoints() {
    if (data[0]["issue"]["type"] != "ScalePrompt") { //各地の震度に関する情報
        //観測点の震度についてすべての観測点に対して繰り返す
        data[0]["points"].forEach(element => {
            var result = JMAPoints.indexOf(element["addr"]);
            if (result != -1) {
                var ImgUrl = "";
                var PointShindo = "";
                if (element["scale"] == 10) {
                    ImgUrl = "../source/jqk_int1.png";
                    PointShindo = "震度1";
                } else if (element["scale"] == 20) {
                    ImgUrl = "../source/jqk_int2.png";
                    PointShindo = "震度2";
                } else if (element["scale"] == 30) {
                    ImgUrl = "../source/jqk_int3.png";
                    PointShindo = "震度3";
                } else if (element["scale"] == 40) {
                    ImgUrl = "../source/jqk_int4.png";
                    PointShindo = "震度4";
                } else if (element["scale"] == 45) {
                    ImgUrl = "../source/jqk_int50.png";
                    PointShindo = "震度5弱";
                } else if (element["scale"] == 46) {
                    ImgUrl = "../source/jqk_int_.png";
                    PointShindo = "震度5弱以上と推定";
                } else if (element["scale"] == 50) {
                    ImgUrl = "../source/jqk_int55.png";
                    PointShindo = "震度5強";
                } else if (element["scale"] == 55) {
                    ImgUrl = "../source/jqk_int60.png";
                    PointShindo = "震度6弱";
                } else if (element["scale"] == 60) {
                    ImgUrl = "../source/jqk_int65.png";
                    PointShindo = "震度6強";
                } else if (element["scale"] == 70) {
                    ImgUrl = "../source/jqk_int7.png";
                    PointShindo = "震度7";
                }

                if (element["isArea"] == false) { //観測点
                    let shindo_latlng = new L.LatLng(JMAPointsJson[result]["lat"], JMAPointsJson[result]["lon"]);
                    let shindoIcon = L.icon({
                        iconUrl: ImgUrl,
                        iconSize: [30, 30],
                        popupAnchor: [0, -40]
                    });
                    var shindo_icon;
                    shindo_icon = L.marker(shindo_latlng, { icon: shindoIcon});
                    shindo_icon.bindPopup('<ruby>'+element["addr"] + '<rt style="font-size: 0.7em;">' + JMAPointsJson[result]["furigana"] + '</rt></ruby>　'+ PointShindo,{closeButton: false, zIndexOffset: 10000,autoPan: false,});
                    shindo_icon.on('mouseover', function (e) {
                        this.openPopup();
                    });
                    shindo_icon.on('mouseout', function (e) {
                        this.closePopup();
                    });
                    map.addLayer(shindo_icon);
                }
            }
        });
    }
    }
});
}
    //パラメーターで警報テキスト表示
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
      }
      window.onload = function() {
        const warn = getQueryParam('warn');
        const titleElement = document.getElementById('warn');
        if (warn === 'eew') {
          titleElement.style.display = 'block'; // 表示
        } else {
          titleElement.style.display = 'none'; // 非表示
        }
      };