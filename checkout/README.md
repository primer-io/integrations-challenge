# Checkout - Payment Methods
The goal of the challenge is to implement a Processor connection using PayPal’s REST API and then implement it on the client side.

- Research
  - Lifecycle of a Digital Transaction
  - PayPal Documentation
- Development
  - Frontend
  - Backend
- Reflection

# Research

## Lifecycle of a Digital Transaction
[This Braintree article](https://articles.braintreepayments.com/get-started/transaction-lifecycle) breaks down a successful transaction into 4 distinct statuses:
1. Authorised
2. Submitted for Settlement
3. Settling
4. Settled

The first stage of a payment lifecycle is an authorisation request from the merchant to the payment gateway (e.g. Braintree or Sage Pay), which is a layer of security between the merchant and the card’s issuing bank. A payment gateway is somewhat similar to what a physical POS terminal does in a brick-and-mortar shop - it validates the customer’s card details and securely transfers them to the bank. If the bank then authorises the transaction, a success code will be returned and there will be a hold put on the funds in the customer’s account (but no actual credit/debit just yet). 
An authorised transaction is then submitted for settlement. The simplest (and default) way is immediate submission, but separate authorisation and capture are also typically supported. This may be useful for businesses that charge money when the customer’s order is fulfilled (e.g. after a guest arrives at the hotel). On successful submission, PayPal returns a Settlement Pending (`4002`) code, which should then change to Settled (`4000`), provided that the issuing bank approves the settlement. At this stage, a transaction is captured, meaning that funds are debited from the customer account and routed to the merchant.

It is important to note that the above relates to a lifecycle of a successful transaction. If something goes wrong, there are many other possible statuses, as outlined [here](https://developers.braintreepayments.com/reference/general/statuses#transaction).

## PayPal Documentation

### Getting Credentials
After creating a developer account, I went on to explore the Get Started page of the API documentation to identify the best place to start, which was retrieving the API credentials that I could use in the `PayPal.ts` file. As it is not a live application, I chose the Sandbox tab and took note of the credentials. After this, I created the sandbox accounts. When creating an account, I was given two options to choose from: Personal or Business. Given the scenario, I created both as I needed a merchant account for the server-side and a customer account for testing the client-side.

### Making API Calls
After getting my credentials, I started to explore how can I use them to make API calls. From the sample `cURL` call to the Orders API, I saw that the `Authorization` header can take two authentication schemes : `Bearer <Access-Token>`, or `Basic <client_id:secret>`. Although I acknowledge that it is more secure to use the `Bearer` scheme, I decided to start with the `Basic` scheme for simplicity (Access Tokens have a brief lifetime and require regeneration and extra error handling). I tried to make a sample call to create an order myself, but I was met with an `“Unable to read x509 certificate”` error. [This page on StackOverflow](https://stackoverflow.com/questions/60829911/unable-to-read-x509-certificate-when-making-https-calls-to-paypals-subscripti) suggested to use base64 encoding, so I converted the `<client_id>:<secret>` string using an online converter tool. That resolved the error and I made the call successfully.  

After skimming through the API Reference, I identified that for this exercise, I will need to use the Orders API. I was happy to find information on almost the whole lifecycle on the same page (cancelling transactions was in the Payments API).

### Creating Orders
To create an order, we can send a `POST` request, where two things are required in the `body`: `intent` and `purchase_units`. There are two possible values for `intent`: `CAPTURE` and `AUTHORISE`. Taking the challenge into account, I will need the `AUTHORISE` value, so that payments are not captured immediately. I also saw that `AUTHORISE` `intent` only works when there is one `purchase_unit`.

### Authorising Payments
From the response of the create order request, I can get the order ID to use in the authorisation `POST` request. The response includes a status code, based on which I should be able to know the results.

### Cancelling Transactions
Knowing how to cancel transactions was not critical for me to begin development, so I postponed this part of my research until I tried to tackle implementing the cancel method. After being unable to find any reference to cancelling orders or authorisations in the Orders API documentation, I decided to google how to do it, which led me to PayPal’s Payments API. To cancel a transaction, an authorisation needs to be voided by sending a `POST` request and the only piece of information I need for that is the transaction ID.

### Payment Button
In the [Checkout documentation](https://developer.paypal.com/docs/checkout/), I found that the PayPal button’s `options` object needs two keys: `createOrder` and `onApprove`. From my previous research on the Orders API, I quickly realised that I can use `createOrder` to create an order with some currency and amount and get an order ID on successful response. I can then use that in `onApprove`, which will call the `onAuthorizeTransaction` method with the value of order ID as an argument.

## Repository Exploration
After reading the instructions and conducting the initial research on transactions and PayPal’s Orders API, I began to explore the file structure of the repository to identify any useful information to get me started. I looked at the `server.ts` file and took note of the defined routes. I have also looked at `index.html` to identify what HTML elements I will be working with and what scripts will be run. 

In `setup.js`, one thing that stuck out was the `URL` string and the query parameters in it: `currency=EUR`, `client-id` and `intent=authorize`. I recognised the config route of our server and saw that a `clientId` variable is used in the `url` string. To figure out the origin of the data, I went back to `server.ts` and eventually traced everything back to `PayPal.ts`. I have also noticed the `console.log()` statements. At this stage, my console was showing `‘Failed to load PayPal SDK’`, as I have not added credentials yet.

In `client.js`, I noticed that the `onAuthorizeTransaction` function looks similar to the `cURL` call that I saw in the documentation. I also saw the comments about the PayPal SDK, and went back to documentation to find out more, starting with what to pass to the options object. 
Lastly, in `PayPal.ts`, I saw the type imports, so I looked at `tsconfig.json`, which led me to the `app-framework` folder. I briefly glanced over the type definitions, as I expect to come back here a lot. With all of this information at hand, I was ready to begin.

# Development 

## Adding Credentials
I had to add my credentials to be able to load the PayPal SDK. To avoid exposing the API keys publicly, I decided to add `dotenv` as a dependency. I created a `.env` file, added my environment variables and changed the `.gitignore`. After that, the button started to render correctly.

## Frontend
After adding the credentials, I identified that it will make more sense to begin my work with implementing `renderPayPalButton` in `client.js` as I will be able to start with creating an order, which is the first step to consider, according to the Orders API. 

For `createOrder`, I have followed the `actions.order.create()` structure as suggested by the documentation. The example only included `value`, so to fully adhere to the goal, I would also need to set `currency_code` to `“EUR"` and intent to `“AUTHORIZE”`. I also understand that the SDK URL in `setup.js` already has those parameters, but I decided to leave them in to be explicit.

After writing the method, I pressed the button and my test user was prompted to make an EUR 12.99 purchase, as expected. In the sandbox, transaction is showing as pending authorisation. Same on the merchant’s side.

Writing `onApprove` was a little bit less straightforward, as the documentation only deals with transactions of `“CAPTURE”` intent. I had to retrieve the order ID from the order we just created. To get some visibility, I `console.logged` the data and found `orderID` in the object. After that, the only thing remaining was to call `onAuthoriseTransaction(data.orderID)`.

Testing in browser would now crash my server, with an error pointing to the authorise method in `PayPal.ts`, which is exactly what I was hoping for.

## Backend

### authorize
With client-side out of the way, I moved on to implementing the `authorize` method. The first thing to figure out there was authentication. From my research I know that I need to use base64 encoding on the `<client_id>:<secret>` string. 

Thanks to TypeScript’s autocompletion, I quickly identified that I can get to these values through the `processorConfig` property of the `request`. To confirm this I went to the type definitions and saw that `request` is of type `RawAuthorizationRequest`, which has `ClientIDSecretCredentials` as a parameter and extends the `IProcessorRequest` interface (which has the `proccessorConfig` property).

To encode the string, I used the global `Buffer` object and then used it in the `Authorization` header of the `POST` request to create an authorisation, as per the documentation. When trying to look into the response, I was initially met with an `“UNSUPPORTED_MEDIA_TYPE”` error, so I took a step back and experimented with `cURL` requests. It turned out that I have misread the documentation and used `Accept` header instead of `Content-Type`. From `HTTPClient.ts`, I saw that a response should include `statusCode` and `responseText`.

I managed to get a `responseText` for a successful authorisation, but I did not know where to see all possible status codes, as I could only find the status strings, such as `CREATED` or `APPROVED`. Therefore, I added a `console.log(response.statusCode)` statement and tried to think about what potential edge cases I could test for. Here is what I found:

- `201`: Success
- `401`: Invalid Credentials
- `422`: Repeat authorisation request (could replicate by sending a `cURL` request with the same `orderID` twice)

Another test case that crossed my mind is what happens if there are insufficient funds. I tried to simulate this scenario by changing the PayPal balance and increasing the transaction amount, but the payment method would default to a credit card with unlimited funds. Enabling the Negative Testing option on the account, as suggested [here](https://www.paypal-community.com/t5/Sandbox-Environment/Sandbox-Negative-Testing-of-insufficient-funds/td-p/1951260) did not seem to have any effect either. Although it is not clear, the documentation suggests that `DENIED` and `VOIDED` transactions fall under the `201` code.

Equipped with this information, I went to read the `ParsedAuthorisationResponse` definition and saw that there are three distinct return types. This nudged me towards writing a conditional statement with 4 branches: 
```
    If code is 201, then
        If status is VOIDED, return the processorTransactionId and ‘CANCELLED’
        If status is DENIED, return declineReason = ‘Insufficient funds’ and ‘DECLINED’
        Else, return the processorTransactionId and ‘AUTHORIZED’
    If code is 401, return errorMessage = ‘Invalid credentials’ and ‘FAILED’
    If code is 422, return errorMessage = ‘Transaction has already been authorised’ and ‘FAILED’
    Else, I return errorMessage = ‘Unknown error’ and ‘FAILED’
```