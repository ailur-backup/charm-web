const path = require('path');

module.exports = {
    entry: {
        account: './src/ts/account.ts',
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
        path: path.resolve(__dirname, `dist/static/js`)
    },
};
