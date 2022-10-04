# Simple DB fro Node JS

This module presents a simple, serverless, encrypted, and deploy-ready data storage for Node JS. It stores essentially JSON data, but they are encrypted, hence enabling clients to push and pull relatively sensitive data (such as your name, address, where you studied, where you work etc.) to source control platforms such as git. That being said, do NOT use this module if your app stores critically sensitive data, such as Credit Card information and governmental idenfication information.

It has only 1 dependency, and allows clients to implement deploy-ready data persistent application without having to think about what database to use (mongo/my-sql/sql server/oracle db etc.), where, and how to deploy them. It resides just next to your server application (nodeJS).

This data store module fits well if your app is:

1. Written in NodeJS

2. Relatively simple and does not need Availability features such as cross-region duplication, sharding, etc.

3. Does not work with critical / sensitive data such as Credit Card information and governmental idenfication information.

# References

1. [Singleton Implementation and Module Pattern Discussion](https://stackoverflow.com/questions/1479319/simplest-cleanest-way-to-implement-a-singleton-in-javascript?page=1&tab=scoredesc#tab-top)

2. [Singleton Implementation](https://medium.com/swlh/node-js-and-singleton-pattern-7b08d11c726a)

3. [Private (functional) constructors](https://stackoverflow.com/questions/21667149/how-to-define-private-constructors-in-javascript)

4. [The Javascript Module Pattern](https://www.oreilly.com/library/view/learning-javascript-design/9781449334840/ch09s02.html)

5. [Unit Testing and Mocking with NodeJS](https://blog.logrocket.com/unit-testing-node-js-applications-using-mocha-chai-and-sinon/)
