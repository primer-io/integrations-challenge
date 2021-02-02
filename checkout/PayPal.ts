require('dotenv').config()

import {
  ClientIDSecretCredentials,
  ParsedAuthorizationResponse,
  ParsedCaptureResponse,
  PayPalOrder,
  ProcessorConnection,
  RawAuthorizationRequest,
  RawCancelRequest,
  RawCaptureRequest,
} from '@primer-io/app-framework';

/**
 * Use the HTTP Client to make requests to PayPal's orders API
 */
import HTTPClient from '../common/HTTPClient';

const PayPalConnection: ProcessorConnection<
  ClientIDSecretCredentials,
  PayPalOrder
> = {
  name: 'PAYPAL',

  website: 'https://paypal.com',

  //please create a .env file in the root directory and add these three variables there
  configuration: {
    accountId: process.env.ACCOUNT_ID!,
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
  },

  /**
   * Authorize a PayPal order
   * Use the HTTPClient and the request info to authorize a paypal order
   */
  authorize(
    request: RawAuthorizationRequest<ClientIDSecretCredentials, PayPalOrder>,
  ): Promise<ParsedAuthorizationResponse> {
    //encoding the client_id:secret string to base 64 and concatenating the URL string for request
    let str = `${ request.processorConfig.clientId }:${ request.processorConfig.clientSecret }`
    let auth = Buffer.from(str).toString("base64")
    let url = 'https://api-m.sandbox.paypal.com/v2/checkout/orders/' + request.paymentMethod.orderId + '/authorize'

    return HTTPClient.request(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      method: 'post',
      body: ''
    })
    .then((response) => {
      let responseText = JSON.parse(response.responseText)
      let status = responseText.purchase_units[0].payments.authorizations[0].status
      let transactionId = responseText.purchase_units[0].payments.authorizations[0].id
      let result: ParsedAuthorizationResponse

      /*
      * returning a ParsedAuthorisationResponse
      * value is based on the status code of the response and the type definition of ParsedAuthorisationResponse
      */
      if (response.statusCode == 201) {
        if (status == 'VOIDED') {
          result = {
            processorTransactionId: transactionId,
            transactionStatus: 'CANCELLED'
          }
        }
        else if (status == 'DENIED') {
          result = {
            declineReason: 'Insufficient funds',
            transactionStatus: 'DECLINED'
          }
        }
        else {
          result = {
            processorTransactionId: transactionId,
            transactionStatus: 'AUTHORIZED'
          }
        }
      }
      else if (response.statusCode == 401) {
        result = {
          errorMessage: 'Invalid credentials',
          transactionStatus: 'FAILED'
        }
      }
      else if (response.statusCode == 422) {
        result = {
          errorMessage: 'Transaction has already been authorised',
          transactionStatus: 'FAILED'
        }
      }

      return result!
    })
  },

  /**
   * Cancel a PayPal order
   * Use the HTTPClient and the request information to cancel the PayPal order
   */
  cancel(
    request: RawCancelRequest<ClientIDSecretCredentials>,
  ): Promise<ParsedCaptureResponse> {
    //encoding the client_id:secret string to base 64 and concatenating the URL string for request
    let str = `${ request.processorConfig.clientId }:${ request.processorConfig.clientSecret }`
    let auth = Buffer.from(str).toString("base64")
    let url = 'https://api-m.sandbox.paypal.com/v2/payments/authorizations/' + request.processorTransactionId + '/void'
    return HTTPClient.request(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      method: 'post',
      body: ''
    })
    .then((response) => {
      let result: ParsedCaptureResponse
      
      /*
      * returning a ParsedCaptureResponse
      * value is based on the status code of the response and the type definition of ParsedCaptureResponse
      */
      if (response.statusCode == 204) {
        result = {
          transactionStatus: 'CANCELLED'
        }
      }
      else if (response.statusCode == 401) {
        result = {
          errorMessage: 'Invalid credentials',
          transactionStatus: 'FAILED'
        }
      }
      else if (response.statusCode == 422) {
        result = {
          errorMessage: 'Transaction has aready been voided',
          transactionStatus: 'FAILED'
        }
      }
      else {
        result = {
          errorMessage: 'Unknown error',
          transactionStatus: 'FAILED'
        }
      }

      return result!
    })
  },

  /**
   * Capture a PayPal order (You can ignore this method for the exercise)
   */
  capture(
    request: RawCaptureRequest<ClientIDSecretCredentials>,
  ): Promise<ParsedCaptureResponse> {
    throw new Error('Not Implemented');
  },
};

export default PayPalConnection;
