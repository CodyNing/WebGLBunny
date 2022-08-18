#version 300 es


// TODO: Define the inputs. The first input
// will be the position and the second will be
// the color.
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec4 color;

// TODO: Define the outputs. Since the output for the vertex
// position is a built-in variable, we just need to define
// an output for the color. Note that the default interpolation 
// qualifier is smooth, so it is not neccessary to write.
smooth out vec3 vertexNormal;
smooth out vec3 vertexPosition;
smooth out vec4 vertexColor;

// TODO: Define a uniform mat4 variable for the
// transformation matrix.
uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;
uniform mat3 normalMatrix;

// uniform mat4 uAmbientLight;
// uniform mat4 uDiffusedLight;
// uniform mat4 uLightPosition;
// uniform vec3 uLightColor;
// uniform vec3 uLightDirection;

// Per-vertex transformations 
// should be computed in the vertex shader.
void main() {

    // TODO: Write the position to gl_Position.
    // Remember, we need to use homogenous coordinates.
    // gl_Position = transform*vec4(position, 1.0f);
    gl_Position = projection * view * model * vec4(position, 1.0f);

    vertexNormal = normalMatrix * normal;

    vertexPosition = (model * vec4( position, 1.0 )).xyz;
    

    // TODO: Write the color to the output defined earlier.
    
    vertexColor = color;

}