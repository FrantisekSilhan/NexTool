# NexTool

The project is a web application built using Node.js and Express framework. It primarily focuses on user authentication, file management, and file sharing functionalities. It allows users to log in, upload files, and access/download files stored in the system's database.

## Features

1. User Authentication: Login system with session management.
2. File Management: Upload files.
3. File Sharing: Access and download stored files.
4. Database Interaction: Interacts with a database for user and file management.

### Todo

- [x] Create admin group for managing files, invite codes, etc (manager all users: ban, unban, change groups; manage all files: remove files and change visibility; manage all invite codes: remove invite codes)
- [x] Add being able to generate invite codes
- [x] Create error page
- [x] Add option to convert images to gif (for discord)
- [x] Add option to delete a file
- [x] Add file embed for discord
- [x] Add image compression
- [x] Add syntax highlighting
- [x] Add responsive navbar style for mobile
- [ ] Add groups for uploading bigger files
- [ ] Add option to make private file public by link or private (now it is public by link)
- [ ] Add files filter (mimeType, file name, size, ...)

## Getting Started

To get started with NexTool, follow these steps:

1. Clone the repository:

```
git clone https://github.com/FrantisekSilhan/NexTool.git
```

2. Install dependencies:

```
cd NexTool
```

```
npm install
```

3. Configure the application as needed, including setting up database connections and environment variables: Rename `.env.example` to `.env`. Also check `~/shared.js` and `~/src/config.js`.

4. Run the application:

```
npm start
```

5. Access NexTool in your web browser at [http://localhost:6975](http://localhost:6975).

6. Create your first account using `00000000000-0000000000--00000000` invite code.

## Contributing

Contributions to NexTool are welcome! If you'd like to contribute, please follow these steps:

1. Fork the repository.
2. Create a new branch:

```
git checkout -b feature/new-feature
```

3. Use 2 space indentation please.

4. Commit your changes:

```
git commit -am 'Add new feature'
```

5. Push to the branch:

```
git push origin feature/new-feature
```

6. Submit a pull request.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Support

For any questions, issues, or feedback, please [Open an issue](https://github.com/FrantisekSilhan/NexTool/issues) or contact me at frantisek@slhn.cz

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=FrantisekSilhan/NexTool&type=Date)](https://star-history.com/#FrantisekSilhan/NexTool)
