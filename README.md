# FastScalper

FastScalper is a high-performance trading application built with Tauri, combining the power of Rust for backend operations with a modern web-based frontend. It's designed for quick and efficient order placement in various financial markets.

## Features

- Quick order placement for buying and selling
- Support for multiple exchanges and product types
- Customizable settings for API key, exchange, and product type
- Persistent settings storage using localStorage
- Responsive UI built with Tailwind CSS

## Technologies Used

- [Tauri](https://tauri.app/): For creating cross-platform desktop applications
- [Rust](https://www.rust-lang.org/): Backend logic and integration with trading APIs
- JavaScript: Frontend interactivity
- [Tailwind CSS](https://tailwindcss.com/): For styling the user interface
- HTML: Structure of the user interface

## Installation

1. Ensure you have [Node.js](https://nodejs.org/) and [Rust](https://www.rust-lang.org/tools/install) installed on your system.
2. Clone this repository:
   ```
   git clone https://github.com/yourusername/fastscalper.git
   cd fastscalper
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Usage

To run the application in development mode:

```
npm run tauri dev
```

To build the application for production:

```
npm run tauri build
```

## Development Setup

1. Frontend code is located in the `src` directory.
2. Rust backend code is in the `src-tauri/src` directory.
3. Tauri configuration can be found in `src-tauri/tauri.conf.json`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This software is for educational purposes only. Use at your own risk. The authors and contributors are not responsible for any financial losses incurred through the use of this software.
