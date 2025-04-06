// app/index.tsx

import React,  { useState, useEffect, useMemo } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router'; // import useRouter
import express from 'express'
import session from 'express-session';
import { Issuer, generators, Client, TokenSet } from 'openid-client';
import { useAuthRequest,  exchangeCodeAsync, revokeAsync, ResponseType, TokenResponse } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from './AuthContext';
import {jwtDecode} from 'jwt-decode';

// Cognito Configuration
const clientId = '5rc901f2m2a9gcvp5eaid4d3bh';
const userPoolUrl =
  'https://ap-southeast-2er4oci3go.auth.ap-southeast-2.amazoncognito.com';
const redirectUri = 'https://biteclips.mooo.com/Callback';
WebBrowser.maybeCompleteAuthSession(); // Auto close external page

const HomePage = () => {
  const router = useRouter(); // get router
  const { setAuthTokensAndUser } = useAuth();
  var authTokens : string;

const discoveryDocument = useMemo(() => ({
    authorizationEndpoint: userPoolUrl + '/oauth2/authorize',
    tokenEndpoint: userPoolUrl + '/oauth2/token',
    revocationEndpoint: userPoolUrl + '/oauth2/revoke',
  }), []);

const [request, response, promptAsync] = useAuthRequest(
{
    clientId,
    responseType: ResponseType.Code,
    redirectUri,
    usePKCE: true,
},
discoveryDocument
);

useEffect(() => {
    const exchangeFn = async (exchangeTokenReq: any) => {
      
      try {
        const exchangeTokenResponse = await exchangeCodeAsync(
          exchangeTokenReq,
          discoveryDocument
        );
        authTokens = exchangeTokenResponse.accessToken;
        console.log(exchangeTokenResponse)

        if(exchangeTokenResponse.idToken)
        {
        const decodedToken = jwtDecode(exchangeTokenResponse.idToken);  // `idToken` is the idToken from Cognito response
        const username = decodedToken['cognito:username'];  // `cognito:username` is the claim for the username
        console.log('Username:', username);
        setAuthTokensAndUser (authTokens,username);
        }
        console.log(`Auth tokens Set! : ${authTokens}`);

      //Now we move to next page
      router.push('/VideoPlayer')
      } catch (error) {
        console.error(error);
      }
    };
    if (response) {
      if (response.type == "error") {
        console.log('Authentication error')
        Alert.alert(
          'Authentication error',
          response.params.error_description || 'something went wrong'
        );
        return;
      }
      if (response.type === 'success') {
        console.log('Auth Response Success')
        exchangeFn({
          clientId,
          code: response.params.code,
          redirectUri,
          clientSecret: '1u9b6f77g7c96lsisb1prsjq1k8lefbduns23dmdebrpmk50mgn1',
          extraParams: {
            code_verifier: request.codeVerifier,
          },
        });
      }
    }
  }, [discoveryDocument, request, response]);


  const logout = async () => {
    console.log(authTokens + discoveryDocument)

    if (!authTokens || !discoveryDocument) {
      return;
    }
    console.log("SignOut in progress")
    
    try {
      const urlParams = new URLSearchParams({
        client_id: clientId,
        logout_uri: redirectUri,
      });
      var temp = `${userPoolUrl}/logout?${urlParams.toString()}`
      console.log(temp)

      // Open the logout page in the browser
      await WebBrowser.openAuthSessionAsync(`${userPoolUrl}/logout?${urlParams.toString()}`);
      
    } catch (error) {
      // Log the error but don't throw it since we want to continue with clearing tokens
      console.error('Error during token revocation:', error);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BiteClips</Text>
      <Text style={styles.buttonText}>Stock clips for inspiration</Text>
        <TouchableOpacity style={styles.button} onPress={() => promptAsync()}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
    </View>
  );
};



// 🔹 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 64,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#1e1e1e",
    borderRadius: 10,
    paddingHorizontal: 15,
    color: "#fff",
    marginBottom: 15,
  },
  button: {
    width: "40%",
    height: 50,
    backgroundColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 80,

  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  forgotPassword: {
    color: "#3498db",
    marginTop: 10,
  },
});

export default HomePage;
