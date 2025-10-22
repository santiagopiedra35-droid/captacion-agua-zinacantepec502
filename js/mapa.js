function initMap() {
   
      var map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 19.266, lng: -99.76 },
        zoom: 12,
        mapTypeId: 'terrain'
      });

      const locations = [
        {
          position: { lat: 19.274528, lng: -99.774278 },
          title: "San Antonio Acahualco",
          info: "Lluvia débil 🌧️<br>Sensación: 17°<br>Precipitación: 50% (0.3 mm)<br>Condición: Con sequía."
        },
        {
          position: { lat: 19.292056, lng: -99.768167 },
          title: "San Francisco Tlalcilalcalpan",
          info: "Precipitación: 7.4 mm ☔<br>Probabilidad: 80%<br>Condición: Con sequía."
        },
        {
          position: { lat: 19.27925, lng: -99.731667 },
          title: "San Miguel Zinacantepec",
          info: "Lluvia débil 🌦️<br>Sensación: 16°<br>Precipitación: 60% (0.4 mm)<br>Condición: Con sequía."
        },
        {
          position: { lat: 19.240944, lng: -99.760389 },
          title: "San Juan de las Huertas",
          info: "Lluvia débil 🌧️<br>Sensación: 15°<br>Precipitación: 70% (1.1 mm)<br>Condición: Con sequía."
        },
        {
          position: { lat: 19.265694, lng: -99.758056 },
          title: "Colonia Ricardo Flores Magón",
          info: "Probabilidad de lluvia: 60% ☁️<br>Precipitación: 5.6 mm<br>Condición: Con sequía."
        }
      ];

      locations.forEach((loc) => {
        const marker = new google.maps.Marker({
          position: loc.position,
          map: map,
          title: loc.title
        });

        const infowindow = new google.maps.InfoWindow({
          content: `<div style="font-size:14px;"><strong>${loc.title}</strong><br>${loc.info}</div>`
        });

        marker.addListener("click", () => {
          infowindow.open(map, marker);
        });
      });
    }


