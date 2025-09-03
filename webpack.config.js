const path = require('path');

module.exports = {
    entry: {
        login: './src/ts/login.ts',
        signup: './src/ts/signup.ts',
        app: './src/ts/app.ts',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            }
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    mode: 'none',
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, `dist/static/js`),
        library: "Meow"
    },
};
