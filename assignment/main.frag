#version 300 es
#define M_PI 3.1415926535897932384626433832795
precision mediump float;

// TODO: Define the input to the fragment shader
// based on the output from the vertex shader,, assuming
// there are no intermediate shader stages.
in mediump vec4 vertexColor;
in mediump vec3 vertexNormal;
in mediump vec3 vertexPosition;

// TODO: Define the color output.
out mediump vec4 outputColor;

uniform vec3 cameraPosition;
uniform vec4 color;

struct PointLight {
    vec3 position;
    vec3 direction;
    vec4 ambientProduct;
    vec4 diffuseProduct;
    vec4 specularProduct;
};

struct SpotLight{
    vec3 position;
    vec3 direction;
    mediump float innerCutoff;
    mediump float outerCutoff;
    vec4 ambientProduct;
    vec4 diffuseProduct;
    vec4 specularProduct;
};

// uniform vec4 ambientProduct;
// uniform vec4 diffuseProduct;
// uniform vec4 specularProduct;
// uniform float ambientLight;
    
// The specular values passed in from the shader
// uniform float specularAmount;
uniform float specularBeta;

// // The light direction
// uniform vec3 light;

uniform PointLight pointLight;
uniform SpotLight spotLight;

// The values passed down from the vertex shader


void main() {
    // TODO: Write the color to the output.
    // vec4 color = vec4(1.0, 0.0, 0.0, 1.0);
    // vec3 adjustedNormal = normalize(vertexNormal) * 0.5 + 0.5;
    // outputColor = vec4((color.xyz * 0.5 + adjustedNormal * 0.5), 1.0);
    // outputColor = vertexColor;
    vec3 vertexNormal = normalize(vertexNormal);

    // float dis = distance(pointLight.position, vertexPosition);
    // vec3 l = normalize(light - vertexPosition);
    // dir = |a - b|
    vec3 v = normalize(cameraPosition - vertexPosition);
    
    vec3 l = normalize(pointLight.position - vertexPosition);
    // h = (l + v) / |l + v|
    vec3 h = normalize( l + v );

    // diffuse coef = dot(n, l)
    float dcoef = max(dot(vertexNormal, l), 0.0);

    // speccular coef = dot(n, h) ^ beta
    float scoef = pow(max(dot(vertexNormal, h), 0.0), specularBeta);

    vec4 intensity = pointLight.ambientProduct 
        + pointLight.diffuseProduct * dcoef 
        + pointLight.specularProduct * scoef;
    // intensity.x = max(0.0, min(1.0, intensity.x));
    // intensity.y = max(0.0, min(1.0, intensity.y));
    // intensity.z = max(0.0, min(1.0, intensity.z));

    // if (dis < 0.0){
    //     intensity *= 0.0;
    // }

    // dis = distance(spotLight.position, vertexPosition);
    l = normalize(spotLight.position - vertexPosition);
    h = normalize( l + v );
    float dotFromDirection = dot(l, spotLight.direction);
    float theta = acos(dotFromDirection) ;
    // float spot = smoothstep(spotLight.outerCutoff, spotLight.innerCutoff, dotFromDirection);
    float spot = cos(theta);
    if (theta > spotLight.outerCutoff){
        spot = 0.0;
    }
    dcoef = spot * max(dot(vertexNormal, l), 0.0);
    scoef = spot * pow(max(dot(vertexNormal, h), 0.0), specularBeta);

    intensity += spotLight.ambientProduct 
        + spotLight.diffuseProduct * dcoef
        + spotLight.specularProduct * scoef;
        
    // if (dis < 0.0){
    //     intensity *= 0.0;
    // }

    outputColor = vec4(color.xyz * intensity.xyz, color.w);
    // outputColor = color;
    // outputColor.rgb *= dcoef;
    // outputColor.rgb += scoef;
    // // Calculate the specular highlight
    // float specularBrightness = (
    
    //     specularAmount * // Adjust the overall amount of specular light

    //     // Find the angle between the normal and the halfwayVector by taking
    //     // the dot product, and then raise it to a certain power. The power
    //     // increases or decreases the size of the bright spot.
    //     pow(
    //         max(0.0, dot(vertexNormal, halfwayVector)),
    //         specularShininess
    //     )
    // );
    
    // Calculate the brightness of the surface using the lambertian lighting model
    // float lightDotProduct = dot( normalize(vertexNormal), light );
    // float surfaceBrightness = max( 0.0, lightDotProduct );
    
    // // Multiply together all of the various light values
    // outputColor = vec4(color.xyz * surfaceBrightness + specularColor.xyz * specularBrightness, color.w);
}