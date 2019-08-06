import React, { Component } from 'react'
import MapGL from 'react-map-gl'
import _ from 'lodash'
import ControlPanel from './ControlPanel'
import { json as fetchJson } from 'd3-fetch'

const { REACT_APP_MAPBOX_ACCESS_TOKEN: MAPBOX_ACCESS_TOKEN } = process.env // Set your mapbox token here
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
        ],
        // Increase the heatmap color weight weight by zoom level
        // heatmap-intensity is a multiplier on top of heatmap-weight
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          1,
          MAX_ZOOM_LEVEL,
          3
        ],
        // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
        // Begin color ramp at 0-stop with a 0-transparancy color
        // to create a blur-like effect.
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(33,102,172,0)',
          0.2,
          '#FCE17C',
          // 'rgb(103,169,207)',
          0.4,
          '#F7A541',
          // 'rgb(209,229,240)',
          0.6,
          '#FAA974',
          // 'rgb(253,219,199)',
          0.8,
          '#F99367',
          // 'rgb(239,138,98)',
          0.9,
          '#EF7777'
          // 'rgb(255,201,101)'
        ],
        // Adjust the heatmap radius by zoom level
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          45,
          MAX_ZOOM_LEVEL,
          50
        ],
        // Transition from heatmap to circle layer by zoom level
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7,
          1,
          MAX_ZOOM_LEVEL,
          0.5
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

  debouncedRequestGeoJSON = _.debounce(this.requestGeoJSON, 200)

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

  handleMapLoaded = event => {
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
    const { viewport, allDay, selectedTime, startTime, endTime } = this.state

    return (
      <div style={{ height: '100%' }}>
        <MapGL
          ref={this.mapRef}
          {...viewport}
          width="100%"
          height="100%"
          mapStyle="mapbox://styles/jinksi/cjxzt908l0p201cqd879lgmuq"
          onViewportChange={this.onViewportChange}
          mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
          onLoad={this.handleMapLoaded}
          onMouseDown={this.handleMapClick}
          onTouchStart={this.onTouchStart}
        />
        <ControlPanel
          containerComponent={this.props.containerComponent}
          onChangeMagnitude={this.handleChangeMagnitude}
          magnitude={this.state.magnitude}
        />
      </div>
    )
  }
}
