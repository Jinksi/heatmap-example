import React, { Component } from 'react'
import MapGL from 'react-map-gl'
import _ from 'lodash'
import ControlPanel from './ControlPanel'

const { REACT_APP_MAPBOX_ACCESS_TOKEN: MAPBOX_ACCESS_TOKEN } = process.env // Set your mapbox token here
const MAPBOX_STYLES_URL = 'mapbox://styles/jinksi/cjxzt908l0p201cqd879lgmuq'
const HEATMAP_SOURCE_ID = 'example-source'

export default class App extends Component {
  static defaultProps = {
    dataUrl: 'https://hello-r.jinks.dev/geojson'
    // dataUrl: 'http://localhost:8080/geojson'
  }

  state = {
    viewport: {
      latitude: -28.1723,
      longitude: 153.55022,
      zoom: 12,
      bearing: 0,
      pitch: 45
    },
    features: [],
    magnitude: 0.01
  }

  mapRef = React.createRef()

  mkFeatureCollection = features => ({ type: 'FeatureCollection', features })

  mkHeatmapLayer = (id, source) => {
    const MAX_ZOOM_LEVEL = 24
    return {
      id,
      source,
      maxzoom: MAX_ZOOM_LEVEL,
      type: 'heatmap',
      paint: {
        // Increase the heatmap weight based on frequency and property magnitude
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'magnitude'],
          0,
          0.1,
          6,
          1
        ]
      }
    }
  }

  handleChangeMagnitude = magnitude => {
    this.setState({ magnitude })
    const features = this.filterFeaturesByMagnitude({
      features: this.state.features,
      magnitude
    })

    this.setMapData(features)
  }

  requestGeoJSON = async ({ latitude, longitude }) => {
    const map = this.getMap()
    const response = await fetch(this.props.dataUrl, {
      method: 'POST',
      // headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: latitude,
        lon: longitude
      })
    }).then(res => res.json())

    const geojsonString = _.get(response, '[0]')

    try {
      const geojson = JSON.parse(geojsonString)
      const source = map.getSource(HEATMAP_SOURCE_ID)
      if (!source) {
        map.addSource(HEATMAP_SOURCE_ID, { type: 'geojson', data: geojson })
        map.addLayer(this.mkHeatmapLayer(HEATMAP_SOURCE_ID, HEATMAP_SOURCE_ID))
        this.setState({ features: geojson.features })
      } else {
        const existingFeatures = this.state.features
        const features = [...existingFeatures, ...geojson.features]
        this.setState({
          features
        })
        const { magnitude } = this.state
        this.setMapData(
          this.filterFeaturesByMagnitude({
            features,
            magnitude
          })
        )
      }
    } catch (e) {
      console.error(e)
    }
  }

  onViewportChange = viewport => {
    this.setState({ viewport })
  }

  filterFeaturesByMagnitude = ({ features, magnitude }) => {
    return features.filter(feature => {
      const featureMagnitude = _.get(feature, 'properties.magnitude')
      return featureMagnitude >= magnitude
    })
  }

  getMap = () => {
    return this.mapRef.current ? this.mapRef.current.getMap() : null
  }

  handleMapClick = async e => {
    const longitude = e.lngLat[0]
    const latitude = e.lngLat[1]
    console.log({ latitude, longitude })
    this.requestGeoJSON({ latitude, longitude })
  }

  handleMapLoaded = () => {
    const { latitude, longitude } = this.state.viewport
    this.requestGeoJSON({ latitude, longitude })
  }

  setMapData = features => {
    const map = this.getMap()
    if (map) {
      map
        .getSource(HEATMAP_SOURCE_ID)
        .setData(this.mkFeatureCollection(features))
    }
  }

  render() {
    const { viewport, magnitude } = this.state

    return (
      <div style={{ height: '100%' }}>
        <MapGL
          ref={this.mapRef}
          {...viewport}
          width="100%"
          height="100%"
          mapStyle={MAPBOX_STYLES_URL}
          mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
          onViewportChange={this.onViewportChange}
          onLoad={this.handleMapLoaded}
          onMouseDown={this.handleMapClick}
          onTouchStart={this.handleMapClick}
        />
        <ControlPanel
          containerComponent={this.props.containerComponent}
          onChangeMagnitude={this.handleChangeMagnitude}
          magnitude={magnitude}
        />
      </div>
    )
  }
}
