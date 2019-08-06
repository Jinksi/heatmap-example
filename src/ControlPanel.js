import React from 'react'

const defaultContainer = ({ children }) => (
  <div className="control-panel">{children}</div>
)

const ControlPanel = ({ onChangeMagnitude, magnitude, containerComponent }) => {
  const handleChangeMagnitude = e => {
    const magnitude = e.target.value
    onChangeMagnitude(magnitude)
  }
  const Container = containerComponent || defaultContainer
  return (
    <Container>
      <h3>Filter datapoints</h3>

      <div className={`input`}>
        <label>Min Magnitude: {magnitude}</label>
        <br />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={magnitude}
          onChange={handleChangeMagnitude}
        />
      </div>
    </Container>
  )
}

export default ControlPanel
