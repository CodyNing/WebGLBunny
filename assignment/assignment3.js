/*
    Initialization
*/

// The WebGL context.
var gl
var canvas;

// Variables for spinning the cube
var angel;
var angularSpeed;
var translation;
var translationSpeed;
var zoomSpeed;

var ll = console.log;

// Sets up the canvas and WebGL context.
function initializeContext() {
    // Get and store the webgl context from the canvas    
    canvas = document.getElementById("myCanvas");
    gl = canvas.getContext("webgl2");

    // Determine the ratio between physical pixels and CSS pixels
    const pixelRatio = window.devicePixelRatio || 1;

    // Set the width and height of the canvas
    // using clientWidth and clientHeight
    canvas.width = pixelRatio * canvas.clientWidth;
    canvas.height = pixelRatio * canvas.clientHeight;

    // Set the viewport size
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Set the clear color to white.
    gl.clearColor(1, 1, 1, 0);
    // Set the line width to 1.0.
    gl.lineWidth(1.0);

    // TODO: Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    logMessage("WebGL initialized.");
    
}

async function setup() {
    // Initialize the context.
    initializeContext();

    // Set event listeners
    setEventListeners(canvas);

    // Create cube data.
    createObject();

    // Create vertex buffer data.
    createBuffers();

    // Load shader files
    await loadShaders();

    // Compile the shaders
    compileShaders();

    // Create vertex array objects
    createVertexArrayObjects();

    // TODO: Initialize angle and angularSpeed.
    angel = {
        'x': 0,
        'y': 0
    };
    angularSpeed = 500;

    translation = {
        'x': 0,
        'y': 0,
        'z': 0
    }
    translationSpeed = 10;
    zoomSpeed = 0.01;

    // Draw!
    requestAnimationFrame(render)


};

const matrix = [
    1.0, 0.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0
];

class DrawObject{
    //object info
    positions;
    indices;
    normals;
    color;
    
    //buffers
    position_buffer;
    index_buffer;
    normal_buffer;
    vao;
    prog;
    type;

    //rotation and translation
    model

    //light
    matCoefs;
    specularBeta;
    direction

    constructor(positions, indices, type){
        this.normals = flatten(this.calcNormals(positions, indices));
        this.positions = flatten(positions);
        this.indices = flatten(indices);
        this.color = [0.8, 1.0, 0.0, 1.0];
        this.type = type;
        // this.compileShaders();

        // this.rotation = {
        //     'x': 0,
        //     'y': 0
        // }

        // this.translation = {
        //     'x': 0,
        //     'y': 0,
        //     'z': 0
        // }
        
        // this.scale = {
        //     'x': 1,
        //     'y': 1,
        //     'z': 1
        // }

        this.matCoefs = {
            'ka': [1.0, 0.5, 0.31, 1.0],
            'kd': [1.0, 0.5, 0.31, 1.0],
            'ks': [0.5, 0.5, 0.5, 1.0],
        };


        this.model = mat4(matrix);
        // this.direction = [0, 4, 2, 1];

        this.specularBeta = 32.0;
    }

    calcNormals(positions, indices){
        let normals = Array(positions.length).fill(vec3(0, 0, 0));
        
        for (let i = 0; i < indices.length; ++i){
            let p1 = positions[indices[i][0]];
            let p2 = positions[indices[i][1]];
            let p3 = positions[indices[i][2]];
    
            let u = subtract(p2, p1);
            let v = subtract(p3, p1);
    
            let x = u[1] * v[2] - u[2] * v[1];
            let y = u[2] * v[0] - u[0] * v[2];
            let z = u[0] * v[1] - u[1] * v[0];
    
            let normal = vec3(x, y, z);
            for (let j = 0; j < 3; ++j){
                normals[indices[i][j]] = add(normals[indices[i][j]], normal);
            }
        }
    
        for (let i = 0; i < positions.length; ++i){
            normals[i] = normalize(normals[i]);
        }
        return normals;
    }

    setUniformVariables(view, projection, eye, light) {
    
        // Tell the current rendering state to use the shader program
        gl.useProgram(this.prog);
    
        // Get the location of the uniform variable in the shader
        var locations = {
            model: gl.getUniformLocation(this.prog, "model"),
            view: gl.getUniformLocation(this.prog, "view"),
            projection: gl.getUniformLocation(this.prog, "projection"),
            normal: gl.getUniformLocation(this.prog, "normalMatrix"),
            color: gl.getUniformLocation(this.prog, "color"),
            cameraPosition: gl.getUniformLocation(this.prog, "cameraPosition"),

            // pointlight
            ppos: gl.getUniformLocation(this.prog, "pointLight.position"),
            pdir: gl.getUniformLocation(this.prog, "pointLight.direction"),
            pAmbientProduct: gl.getUniformLocation(this.prog, "pointLight.ambientProduct"),
            pDiffuseProduct: gl.getUniformLocation(this.prog, "pointLight.diffuseProduct"),
            pSpecularProduct: gl.getUniformLocation(this.prog, "pointLight.specularProduct"),
            
            // spotlight
            spos: gl.getUniformLocation(this.prog, "spotLight.position"),
            sdir: gl.getUniformLocation(this.prog, "spotLight.direction"),
            sInnerCutoff: gl.getUniformLocation(this.prog, "spotLight.innerCutoff"),
            sOutterCutoff: gl.getUniformLocation(this.prog, "spotLight.outerCutoff"),
            sAmbientProduct: gl.getUniformLocation(this.prog, "spotLight.ambientProduct"),
            sDiffuseProduct: gl.getUniformLocation(this.prog, "spotLight.diffuseProduct"),
            sSpecularProduct: gl.getUniformLocation(this.prog, "spotLight.specularProduct"),
            
            specularBeta : gl.getUniformLocation(this.prog, "specularBeta"),
        }
    
        let pAmbientProduct = mult(light.pla, this.matCoefs.ka);
        let pDiffuseProduct = mult(light.pld, this.matCoefs.kd);
        let pSpecularProduct = mult(light.pls, this.matCoefs.ks);

        let sAmbientProduct = mult(light.sla, this.matCoefs.ka);
        let sDiffuseProduct = mult(light.sld, this.matCoefs.kd);
        let sSpecularProduct = mult(light.sls, this.matCoefs.ks);
        
    
        var modelView = mult(view, this.model)
    
        var normalM = normalMatrix(modelView, true);
    
        gl.uniformMatrix4fv(locations.model, false, flatten(this.model));
        gl.uniformMatrix4fv(locations.view, false, flatten(view));
        gl.uniformMatrix4fv(locations.projection, false, flatten(projection));
        gl.uniformMatrix3fv(locations.normal, false, flatten(normalM));
    
        
        gl.uniform3fv(locations.cameraPosition, eye);
        gl.uniform4fv(locations.color, this.color);
        gl.uniform1f(locations.specularBeta, this.specularBeta);
    
        gl.uniform3fv(locations.ppos, light.ppos);
        gl.uniform3fv(locations.pdir, light.pdir);
        gl.uniform4fv(locations.pAmbientProduct, pAmbientProduct);
        gl.uniform4fv(locations.pDiffuseProduct, pDiffuseProduct);
        gl.uniform4fv(locations.pSpecularProduct, pSpecularProduct);

        gl.uniform3fv(locations.spos, light.spos);
        gl.uniform3fv(locations.sdir, light.sdir);
        gl.uniform1f(locations.sInnerCutoff, Math.cos(Math.PI / 6));
        gl.uniform1f(locations.sOutterCutoff, Math.cos(Math.PI / 6));
        gl.uniform4fv(locations.sAmbientProduct, sAmbientProduct);
        gl.uniform4fv(locations.sDiffuseProduct, sDiffuseProduct);
        gl.uniform4fv(locations.sSpecularProduct, sSpecularProduct);
    
    }

    createBuffers(){
        this.position_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer);
        gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array(this.positions),
            gl.STATIC_DRAW);
    
        this.index_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index_buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(this.indices),
            gl.STATIC_DRAW);
    
        this.normal_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normal_buffer);
        gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array(this.normals),
            gl.STATIC_DRAW);
    }

    compileShaders(vs, fs) {    
        // Create a shader program.
        this.prog = gl.createProgram();
    
        // Attach the vertex and fragment shaders
        // to the program.
        gl.attachShader(this.prog, vs);
        gl.attachShader(this.prog, fs);
    
        // Link the program
        gl.linkProgram(this.prog);
    
        // Check the LINK_STATUS using getProgramParameter
        if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
            logError(gl.getProgramInfoLog(this.prog));
        }
    
        logMessage("Shader program compiled successfully.");
    }

    createVertexArrayObjects() {

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        var pos_idx = gl.getAttribLocation(this.prog, "position");
        gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer);
        gl.vertexAttribPointer(pos_idx, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(pos_idx);

        var nm_idx = gl.getAttribLocation(this.prog, "normal");
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normal_buffer);
        gl.vertexAttribPointer(nm_idx, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(nm_idx);

        gl.bindVertexArray(null);

    }

    setLight(uk, vk){
        this.uk = uk;
        this.vk = vk;
        this.updateLight();
    }
    
    updateLight(){
        let u = this.getTransPos(this.uk);
        let v = this.getTransPos(this.vk);
        this.direction = subtract(u, v);
        // this.direction[0] = - this.direction[0];
        // ll(this.direction);
    }

    getTransPos(k){
        let pos = [...[0, 1, 2].map(n => this.positions[k * 3 + n]), 1]
        let x = dot(this.model[0], pos);
        let y = dot(this.model[1], pos);
        let z = dot(this.model[2], pos);
        return [x, y, z];
    }

    rotate(x, y){
        var rotX = rotate(x, [0.0, 1.0, 0.0]);
        var rotY = rotate(y, [1.0, 0.0, 0.0]);
        this.model = mult(mult(rotY, rotX), this.model);
    }
    applym(m){
        // ll(m);
        // ll(this.model);
        this.model = mult(m, this.model);
        // ll(this.model);
    }

    translate(x, y, z){
        var translateM = translate(x, y, z)
        this.model = mult(translateM, this.model);
    }

    scale(x, y, z){
        var scaleM = scalem(x, y, z);
        this.model = mult(scaleM, this.model);
    }

    constScale(x, y, z){
        // var scaleM = scalem(x, y, z);
        // this.model = mult(scaleM, this.model);
        for (let i = 0; i < this.positions.length/3; ++i){
            this.positions[i * 3] *= x;
            this.positions[i * 3 + 1] *= y;
            this.positions[i * 3 + 2] *= z;
        }
    }

    rotateOnAxis(phi, axis){
        axis = normalize(axis);
        let a = axis[0];
        let b = axis[1];
        let c = axis[2];
        let pos = this.curPos;
        let t1 = translate(...pos);
        let t2 = translate(...pos.map(p => -p));
        // ll(t1, t2);
        let l = length([a, b, c]);
        let v = length([b, c]);
        let rx = [
            1, 0, 0, 0,
            0, c/v, -b/v, 0,
            0, b/v, c/v, 0,
            0, 0, 0, 1
        ];
        rx = mat4(rx);
        // ll(rx);
        let ry = [
            v/l, 0, -a/l, 0,
            0, 1, -0, 0,
            a/l, 0, v/l, 0,
            0, 0, 0, 1
        ];
        ry = mat4(ry);
        // ll(ry);
        let rz = [
            Math.cos(phi), -Math.sin(phi), 0, 0,
            Math.sin(phi), Math.cos(phi), 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
        rz = mat4(rz);
        // ll(rz);
        let ryn = [
            v/l, 0, a/l, 0,
            0, 1, -0, 0,
            -a/l, 0, v/l, 0,
            0, 0, 0, 1
        ];
        ryn = mat4(ryn);
        // ll(ryn);
        let rxn = [
            1, 0, 0, 0,
            0, c/v, b/v, 0,
            0, -b/v, c/v, 0,
            0, 0, 0, 1
        ];
        rxn = mat4(rxn);
        // ll(rxn);

        let r = mult(t1, mult(rxn, mult(ryn, mult(rz, mult(ry, mult(rx, t2))))));
        // ll(r);
        this.model = mult(r, this.model);

        this.updateLight();
    }

    reset(){
        this.model = mat4(matrix);
    }

    get curPos(){
        // ll(flatten(this.model))
        return [this.model[0][3], this.model[1][3], this.model[2][3]];
    }

    updateColor(c){
        this.color = c;
    }

    draw(){
        gl.useProgram(this.prog);

        var uvs = getGlobalUniformVariables();

        this.setUniformVariables(
            uvs.view,
            uvs.projection,
            uvs.eye,
            uvs.light,
        );

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index_buffer);
        gl.drawElements(this.type, this.indices.length, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }
}

window.onload = setup;

let drawObjects = [];


function createObject(){
    var vertexColors = [
        // [ 0.0, 0.0, 0.0, 1.0 ],  // black
        // [ 1.0, 0.0, 0.0, 1.0 ],  // red
        // [ 1.0, 1.0, 0.0, 1.0 ],  // yellow
        // [ 0.0, 1.0, 0.0, 1.0 ],  // green
        // [ 0.0, 0.0, 1.0, 1.0 ],  // blue
        // [ 1.0, 0.0, 1.0, 1.0 ],  // magenta
        [ 0.0, 1.0, 1.0, 1.0 ],  // cyan
        // [ 1.0, 1.0, 1.0, 1.0 ]   // white
    ];

    let positions = get_vertices();
    let indices = get_faces();
    indices = indices.map(i => i.map(v => v-1));

    let bunny = new DrawObject(positions, indices, gl.TRIANGLES);

    positions = [
        vec3( 0,          0          ,2 ), 
        vec3( 1,          0          ,0 ), 
        vec3( 0.809017,	  0.587785   ,0 ),
        vec3( 0.309017,	  0.951057   ,0 ), 
        vec3( -0.309017,  0.951057   ,0), 
        vec3( -0.809017,  0.587785   ,0),
        vec3( -1,         0          ,0 ), 
        vec3( -0.809017,  -0.587785  ,0),
        vec3( -0.309017,  -0.951057  ,0), 
        vec3( 0.309017,	  -0.951057  ,0 ), 
        vec3( 0.809017,	  -0.587785  ,0 ),
        vec3( 0       ,	   0         ,0 ),
    ];
     
    indices = [
        vec3(0, 1, 2),
        vec3(0, 2, 3),
        vec3(0, 3, 4),
        vec3(0, 4, 5),
        vec3(0, 5, 6),
        vec3(0, 6, 7),
        vec3(0, 7, 8),
        vec3(0, 8, 9),
        vec3(0, 9, 10),
        vec3(0, 10, 1),
    ];
    let lightCone = new DrawObject(positions, indices, gl.LINE_LOOP);
    // lightCone.lookAt(0, 0, 0);
    // lightCone.translate(0, 4, 2);
    // let rm = rotatev2v(vec3(0, 0, 1.5), vec3(0, 4, 0));
    // lightCone.rotatem(rm);
    lightCone.constScale(0.3, 0.3, 0.3);
    let theta = Math.atan2(4, 2) * 180 / Math.PI;
    ll(theta);
    lightCone.rotate(0, -theta);
    lightCone.setLight(0, 11);
    lightCone.translate(0, 4, 2);
    let axis = cross([0, 4, 2], [1, 0, 0]);

    // var lmat = lookAt([0, 4, 2], [0, 0, 0], [0, 1, 0]);
    // lmat = multiply(m4.xRotation(lightRotationX), lmat);
    // lmat = m4.multiply(m4.yRotation(lightRotationY), lmat);
    // lightCone.rotateOnAxis(45, axis);
    // ll(rm);
    
    lightCone.updateColor([0.0, 0.0, 0.0, 1.0]);

    positions = [
        vec3(-1.0, -1.0,  1.0),
        vec3(1.0, -1.0,  1.0),
        vec3(1.0,  1.0,  1.0),
        vec3(-1.0,  1.0,  1.0),
        vec3(-1.0, -1.0, -1.0),
        vec3(1.0, -1.0, -1.0),
        vec3(1.0,  1.0, -1.0),
        vec3(-1.0,  1.0, -1.0)
    ];

    indices = [
		vec3(0, 1, 2),
		vec3(2, 3, 0),
		vec3(1, 5, 6),
		vec3(6, 2, 1),
		vec3(7, 6, 5),
		vec3(5, 4, 7),
		vec3(4, 0, 3),
		vec3(3, 7, 4),
		vec3(4, 5, 1),
		vec3(1, 0, 4),
		vec3(3, 2, 6),
		vec3(6, 7, 3),
        vec3(2, 6, 5),
        vec3(4, 5, 6),
    ]

    let lightCube = new DrawObject(positions, indices, gl.LINES);
    lightCube.scale(0.5, 0.5, 0.5);
    lightCube.translate(5, 5, 0);
    lightCube.updateColor([0.0, 0.0, 0.0, 1.0]);

    drawObjects.push(bunny, lightCone, lightCube);

    // normals = flatten(calcNormals(positions, indices));
    // // console.log(Math.min(...normals))

    // positions = flatten(positions);
    // indices = flatten(indices);


    // for ( let i = 0; i < positions.length; ++i ) {
    //     colors.push(vertexColors[i%vertexColors.length]);
    // }
    // colors = flatten(colors);

}


// Creates buffers using provided data.
function createBuffers() {

    // // Repeat for the color vertex data.
    // color_buffer = gl.createBuffer();
    // gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
    // gl.bufferData(gl.ARRAY_BUFFER,
    //     new Float32Array(colors),
    //     gl.STATIC_DRAW);

    drawObjects.forEach(o => o.createBuffers());

    logMessage("Created buffers.");
}

// Shader sources
var vs_source;
var fs_source;

function loadShaderFile(url) {
    return fetch(url).then(response => response.text());
}

// Loads the shader data from the files.
async function loadShaders() {
    // Specify shader URLs for your
    // local web server.
    const shaderURLs = [
        './main.vert',
        './main.frag'
    ];

    // Load shader files.
    const shader_files = await Promise.all(shaderURLs.map(loadShaderFile));

    // Assign shader sources.
    vs_source = shader_files[0];
    fs_source = shader_files[1];

    // logMessage(vs_source);
    // logMessage(fs_source);

    logMessage("Shader files loaded.")
}

// Shader handles
var vs;
var fs;
var prog;

// Compile the GLSL shader stages and combine them
// into a shader program.
function compileShaders() {
    // Create a shader of type VERTEX_SHADER.
    vs = gl.createShader(gl.VERTEX_SHADER);
    // Specify the shader source code.
    gl.shaderSource(vs, vs_source);
    // Compile the shader.
    gl.compileShader(vs);
    // Check that the shader actually compiled (COMPILE_STATUS).
    // This can be done using the getShaderParameter function.
    // The error message can be retrieved with getShaderInfoLog.
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        logError(gl.getShaderInfoLog(vs));
        gl.deleteShader(vs);
    }

    // Repeat for the fragment shader.
    fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fs_source);
    gl.compileShader(fs);

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        logError(gl.getShaderInfoLog(fs));
        gl.deleteShader(fs);
    }

    // Next we have to create a shader program
    // using the shader stages that we compiled.

    // Create a shader program.
    // prog = gl.createProgram();

    // // Attach the vertex and fragment shaders
    // // to the program.
    // gl.attachShader(prog, vs);
    // gl.attachShader(prog, fs);

    // // Link the program
    // gl.linkProgram(prog);

    // // Check the LINK_STATUS using getProgramParameter
    // if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    //     logError(gl.getProgramInfoLog(prog));
    // }
    drawObjects.forEach(o => o.compileShaders(vs, fs));

    logMessage("Shader program compiled successfully.");
}


function getGlobalUniformVariables(){
    let light = {
        'ppos': drawObjects[2].curPos,
        'pdir': normalize(drawObjects[2].curPos),
        'pla': [0.1, 0.1, 0.1, 1.0],
        'pld': [0.5, 0.5, 0.5, 1.0],
        'pls': [1.0, 1.0, 1.0, 1.0],

        'spos': drawObjects[1].curPos,
        'sdir': normalize(drawObjects[1].direction),
        'sla': [0.1, 0.1, 0.1, 1.0],
        'sld': [1.0, 1.0, 1.0, 1.0],
        'sls': [1.0, 1.0, 1.0, 1.0],
        
    };
    // ll(drawObjects[1].direction);

    // TODO: Define a camera location
    var eye = vec3(translation.x, -translation.y, 10 + translation.z);

    // TODO: Define the target position
    var target = vec3(translation.x, -translation.y, 0);

    // TODO: Define the up direction
    var up = vec3(0, 1, 0);

    // TODO: Create view matrix.
    var view = lookAt(
        eye,
        target,
        up
    );


    // TODO: Calculate the aspect ratio.
    var aspect = canvas.width / canvas.height;

    // TODO: Create a projection matrix.
    var projection = perspective(60.0, aspect, 0.1, 1000.0);

    return {
        'eye': eye,
        'view': view,
        'projection': projection,
        'light': light,
    }
}

// Sets the uniform variables in the shader program
function setUniformVariables() {

    // Tell the current rendering state to use the shader program
    // gl.useProgram(prog);


    let light = {
        'dir': normalize([0.0, 4.0, 1.0]),
        'la': [0.1, 0.1, 0.1, 1.0],
        'ld': [0.5, 0.5, 0.5, 1.0],
        'ls': [1.0, 1.0, 1.0, 1.0],
    };

    // TODO: Define a camera location
    var eye = vec3(translation.x, -translation.y, 10 + translation.z);

    // TODO: Define the target position
    var target = vec3(translation.x, -translation.y, 0);

    // TODO: Define the up direction
    var up = vec3(0, 1, 0);

    // TODO: Create view matrix.
    var view = lookAt(
        eye,
        target,
        up
    );


    // TODO: Calculate the aspect ratio.
    var aspect = canvas.width / canvas.height;

    // TODO: Create a projection matrix.
    var projection = perspective(60.0, aspect, 0.1, 1000.0);
}

// Creates VAOs for vertex attributes
function createVertexArrayObjects() {

    drawObjects.forEach(o => o.createVertexArrayObjects());

    logMessage("Created VAOs.");

}

var lastMousePos;
function updateAngle(currentMousePos) {
    var dx = angularSpeed/canvas.width * (currentMousePos.x - lastMousePos.x)
    var dy = angularSpeed/canvas.height * (currentMousePos.y - lastMousePos.y);
    // angel.x += dx;
    // angel.y += dy;
    drawObjects[0].rotate(dx, dy);
}

function updatePos(currentMousePos) {
    var dx = translationSpeed/canvas.width * (currentMousePos.x - lastMousePos.x)
    var dy = translationSpeed/canvas.height * (currentMousePos.y - lastMousePos.y);
    // translation.x -= dx;
    // translation.y -= dy;
    drawObjects[0].translate(dx, -dy, 0);
}

function updateCam(currentMousePos) {
    var dx = translationSpeed/canvas.width * (currentMousePos.x - lastMousePos.x)
    var dy = translationSpeed/canvas.height * (currentMousePos.y - lastMousePos.y);
    translation.x -= dx;
    translation.y -= dy;
    // drawObjects[0].translate(dx, -dy, 0);
}

let prevTime = 0;
let shouldRotateLightCube = true;
let shouldPanningLightCone = true;
let angelAcc = 0;
let rotatingLeft = true;
function rotateLightCube(timestamp){
    let dt = timestamp - prevTime;
    let dx = dt * 0.05;
    // ll(dx)
    if (shouldRotateLightCube === true){
        drawObjects[2].rotate(dx, 0);
    }

    if(shouldPanningLightCone){
        // let tip = [...[0, 1, 2].map(n => drawObjects[1].positions[n]), 1];
        // let model = drawObjects[1].model;
        // let a = dot(model[0], tip);
        // let b = dot(model[1], tip);
        // let c = dot(model[2], tip);

        // drawObjects[1].translate(...[a, b, c].map(p => -p));
        dx = dx * Math.PI / 180;
        // ll(dx);
        if (rotatingLeft){
            dx = -dx
        }
        if (angelAcc + dx > Math.PI/2 || angelAcc + dx < -Math.PI/2){
            rotatingLeft = !rotatingLeft
            // angeldt = 0;
        }
        angelAcc += dx;
        // ll(angelAcc * 180 / Math.PI);
        // ll(angelAcc);
        let axis = cross([0, 4, 2], [1, 0, 0]);
        // drawObjects[1].rotateOnAxis(dx, [0, 0, 1]);
        drawObjects[1].rotateOnAxis(dx, axis);
        // drawObjects[1].translate(0, 4, 2);
        // drawObjects[1].rotate(dx, 0);
    }
    prevTime = timestamp;
}

// Draws the vertex data.
function render(timestamp) {
    // TODO: Clear the color and depth buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set the rendering state to use the shader program
    // gl.useProgram(prog);

    // TODO: Update uniforms
    // setUniformVariables(timestamp);

    rotateLightCube(timestamp);

    // // Bind the VAO
    // gl.bindVertexArray(vao);
    // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
    
    // // TODO: Draw the correct number of vertices using the TRIANGLES mode.
    // gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    drawObjects.forEach(o => o.draw(timestamp));

    // Call this function repeatedly with requestAnimationFrame.
    requestAnimationFrame(render);
}

/*
    Input Events
*/
let leftMouseDown = false;
let midMouseDown = false;
let rightMouseDown = false;
function setEventListeners(canvas) {
    canvas.addEventListener('keydown', function (event) {
        document.getElementById("keydown").innerText = event.key;
        if(event.key == 'r'){
            translation = {
                'x': 0,
                'y': 0,
                'z': 0
            }
            angel = {
                'x':0,
                'y':0
            }
            drawObjects[0].reset();
        }
        if(event.key == 'p'){
            shouldRotateLightCube = !shouldRotateLightCube;
        }
        if(event.key == 's'){
            shouldPanningLightCone = !shouldPanningLightCone;
        }
    });

    canvas.addEventListener('keyup', function (event) {
        document.getElementById("keyup").innerText = event.key;
    });

    canvas.addEventListener('mousemove', function (event) {
        document.getElementById("mpos_x").innerText = event.x;
        document.getElementById("mpos_y").innerText = event.y;
        var currentMousePos = {
            'x': event.x,
            'y': event.y
        }
        if(leftMouseDown){
            updatePos(currentMousePos);
        }
        if(midMouseDown){
            updateCam(currentMousePos);
        }
        if(rightMouseDown){
            updateAngle(currentMousePos);
        }
        lastMousePos = {
            'x': event.x,
            'y': event.y
        }
    });

    var click_count = 0;
    canvas.addEventListener('click', function (event) {
        click_count += 1;
        document.getElementById("click_count").innerText = click_count;
        
    });

    canvas.addEventListener('mousedown', function (event) {
        lastMousePos = {
            'x': event.x,
            'y': event.y
        }
        if (event.which == 1){
            leftMouseDown = true;
        }
        if (event.which == 2){
            midMouseDown = true;
        }
        if (event.which == 3){
            rightMouseDown = true;
        }
    });

    canvas.addEventListener('mouseup', function (event) {
        if (event.which == 1){
            leftMouseDown = false;
        }
        if (event.which == 2){
            midMouseDown = false;
        }
        if (event.which == 3){
            rightMouseDown = false;
        }
    });

    canvas.addEventListener('wheel', function (event) {
        translation.z += (event.deltaY) / 100;
        event.preventDefault();
        return false;
    });

}

// Logging

function logMessage(message) {
    document.getElementById("messageBox").innerText += `[msg]: ${message}\n`;
}

function logError(message) {
    document.getElementById("messageBox").innerText += `[err]: ${message}\n`;
}

function logObject(obj) {
    let message = JSON.stringify(obj, null, 2);
    document.getElementById("messageBox").innerText += `[obj]:\n${message}\n\n`;
}

function rotatev2v(a, b){
    a = normalize(a);
    b = normalize(b);
    // a = length(a);
    // b = length(b);

    let v = cross(a, b);
    let s = length(v);
    let c = dot(a, b);
    let i3 = mat3([
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0,
    ]);
    let vx = mat3([
        0, -v[2], v[1],
        v[2], 0, -v[0],
        -v[1], v[0], 0
    ]);
    let vx2 = dot(vx, vx);
    let d = (1.0 - c) / Math.pow(s, 2);
    let vx2d = [];
    for (let row in vx2){
        for (let ele in row){
            vx2d.push(ele * d);
        }
    }
    vx2d = mat3(vx2d);
    let r3 = add(vx, vx2d);
    // r3 = normalize(r3);
    return mat4([...r3.map(r => [...r, 0]).flat(), 0, 0, 0, 1]);
}