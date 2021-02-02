# Checkout - Payment Methods

The goal of the challenge is to implement a Processor connection using PayPal’s REST API and then implement it on the client side. Before beginning the task, I have broken down the challenge into the following items:

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
An authorised transaction is then submitted for settlement. The simplest (and default) way is immediate submission, but separate authorisation and capture are also typically supported. This may be useful for businesses that charge money when the customer’s order is fulfilled (e.g. after a guest arrives at the hotel). On successful submission, PayPal returns a Settlement Pending (```4002```) code, which should then change to Settled (```4000```), provided that the issuing bank approves the settlement. At this stage, a transaction is captured, meaning that funds are debited from the customer account and routed to the merchant. 
It is important to note that the above relates to a lifecycle of a successful transaction. If something goes wrong, there are many other possible statuses, as outlined [here](https://developers.braintreepayments.com/reference/general/statuses#transaction).

## PayPal Documentation

### Getting Credentials
After creating a developer account, I went on to explore the Get Started page of the API documentation to identify the best place to start, which was retrieving the API credentials that I could use in the ```PayPal.ts``` file. As it is not a live application, I chose the Sandbox tab and took note of the credentials. After this, I created the sandbox accounts. When creating an account, I was given two options to choose from: Personal or Business. Given the scenario, I created both as I needed a merchant account for the server-side and a customer account for testing the client-side.

### Making API Calls
After getting my credentials, I started to explore how can I use them to make API calls. From the sample ```cURL``` call to the Orders API, I saw that the ```Authorization``` header can take two authentication schemes : ```Bearer <Access-Token>```, or ```Basic <client_id:secret>```. Although I acknowledge that it is more secure to use the ```Bearer``` scheme, I decided to start with the ```Basic``` scheme for simplicity (Access Tokens have a brief lifetime and require regeneration and extra error handling). I tried to make a sample call to create an order myself, but I was met with an ```“Unable to read x509 certificate”``` error. [This page on StackOverflow](https://stackoverflow.com/questions/60829911/unable-to-read-x509-certificate-when-making-https-calls-to-paypals-subscripti) suggested to use base64 encoding, so I converted the ```<client_id>:<secret>``` string using an online converter tool. That resolved the error and I made the call successfully.

After skimming through the API Reference, I identified that for this exercise, I will need to use the Orders API. I was happy to find information on almost the whole lifecycle on the same page (cancelling transactions was in the Payments API).