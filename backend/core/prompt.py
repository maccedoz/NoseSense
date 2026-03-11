import random

PROMPT_TEMPLATE = """

Context: "Test smells" are defined as antipatterns or "bad programming practices" in unit test code, indicating potential design problems in the test's source code. Although these tests are not exactly bugs that break compilation or cause the test to fail, they indicate deeper design issues, including readability, comprehensibility, and maintainability.

Among the best-known "Test Smells" are:

Duplicate Assert: This smell occurs when a test method tests for the same condition multiple times within the same test method. If the test method needs to test the same condition using different values, a new test method should be created. 

Example:
```java
@Test
  public void testApplyUdfWithPathButNoFunction() {{
    PubSubProtoToBigQueryOptions options = getOptions();
    options.setJavascriptTextTransformGcsPath("/some/path.js");
    PCollection<String> input = pipeline.apply(Create.of(""));

    assertThrows(IllegalArgumentException.class, () -> runUdf(input, options));
    options.setJavascriptTextTransformFunctionName("");
    assertThrows(IllegalArgumentException.class, () -> runUdf(input, options));

    pipeline.run();
  }}
```

Assertion Roulette: Occurs when a test method has multiple non-documented assertions. Multiple assertion statements in a test method without descriptive messages impact readability, understandability, and maintainability, as it’s not possible to understand the reason for the test failure.

Example:
```java
@Test
  public void rejectAlreadyAddedItem() {{
    CommandResultWithReply<
            ShoppingCart.Command,
            ShoppingCart.Event,
            ShoppingCart.State,
            StatusReply<ShoppingCart.Summary>>
        result1 =
            eventSourcedTestKit.runCommand(replyTo -> new ShoppingCart.AddItem("foo", 42, replyTo));
    assertTrue(result1.reply().isSuccess());
    CommandResultWithReply<
            ShoppingCart.Command,
            ShoppingCart.Event,
            ShoppingCart.State,
            StatusReply<ShoppingCart.Summary>>
        result2 =
            eventSourcedTestKit.runCommand(replyTo -> new ShoppingCart.AddItem("foo", 42, replyTo));
    assertTrue(result2.reply().isError());
    assertTrue(result2.hasNoEvents());
  }}
```

Magic Number Test: This smell occurs when a test method contains unexplained and undocumented numeric literals as parameters or as values to identifiers. These magic values do not sufficiently indicate the meaning or purpose of the number, hindering code understandability. They should be replaced with constants or variables that provide descriptive names for the values.

Example:
```java
@Test
  public void updateFromDifferentNodesViaGrpc() throws Exception {{
    // add from client1
    CompletionStage<Cart> response1 =
        testNode1
            .getClient()
            .addItem(
                AddItemRequest.newBuilder()
                    .setCartId("cart-1")
                    .setItemId("foo")
                    .setQuantity(42)
                    .build());
    Cart updatedCart1 = response1.toCompletableFuture().get(requestTimeout.getSeconds(), SECONDS);
    assertEquals("foo", updatedCart1.getItems(0).getItemId());
    assertEquals(42, updatedCart1.getItems(0).getQuantity());

    // add from client2
    CompletionStage<Cart> response2 =
        testNode2
            .getClient()
            .addItem(
                AddItemRequest.newBuilder()
                    .setCartId("cart-2")
                    .setItemId("bar")
                    .setQuantity(17)
                    .build());
    Cart updatedCart2 = response2.toCompletableFuture().get(requestTimeout.getSeconds(), SECONDS);
    assertEquals("bar", updatedCart2.getItems(0).getItemId());
    assertEquals(17, updatedCart2.getItems(0).getQuantity());
  }}
```

Eager Test: A test case that checks or uses more than one method of the class under test. It is left to interpretation which method calls count towards this smell. Either all methods invoked on the class under test could count, or only methods whose return values are eventually used in assertions. It may or may not have the @Ignore annotation.

Example:
```java
@Test
  public void testBeamWindowedValueEncoderMappings() {{
    BASIC_CASES.forEach(
        (coder, data) -> {{
          List<WindowedValue<?>> windowed =
              Lists.transform(data, WindowedValues::valueInGlobalWindow);

          Encoder<?> encoder = windowedValueEncoder(encoderFor(coder), windowEnc);
          serializeAndDeserialize(windowed.get(0), (Encoder) encoder);

          Dataset<?> dataset = createDataset(windowed, (Encoder) encoder);
          assertThat(dataset.collect(), equalTo(windowed.toArray()));
        }});
  }}
```

Ignored Test: JUnit 4 provides developers with the ability to suppress test methods from running. However, these ignored test methods add unnecessary compilation overhead and increase code complexity and comprehension burden.

Example:
```java
@Test
private void testCanceledPipeline(final SparkStructuredStreamingPipelineOptions options)
      throws Exception {{

    final Pipeline pipeline = getPipeline(options);

    final SparkStructuredStreamingPipelineResult result =
        (SparkStructuredStreamingPipelineResult) pipeline.run();

    result.cancel();

    assertThat(result.getState(), is(PipelineResult.State.CANCELLED));
  }}
```

Unknown Test: An assertion statement is used to declare an expected boolean condition for a test method. However, it’s possible for a test method to be written without any assertions. In this case, JUnit will show the test as passing if no exceptions are thrown, making it hard to understand the purpose of the test.

Example:
```java
@Test
public void hitGetPOICategoriesApi() throws Exception {{
    POICategories poiCategories = apiClient.getPOICategories(16);
    for (POICategory category : poiCategories) {{
        System.out.println(category.name() + ": " + category);
    }}
}}
```

Verbose Test: A test method with more than 30 lines. It may indicate multiple responsibilities, affecting test maintainability.

Example:
```java
@Test
  public void safelyUpdatePopularityCount() throws Exception {{
    ClusterSharding sharding = ClusterSharding.get(system);

    final String item = "concurrent-item";
    int cartCount = 30;
    int itemCount = 1;
    final Duration timeout = Duration.ofSeconds(30);

    // Given `item1` is already on the popularity projection DB...
    CompletionStage<ShoppingCart.Summary> rep1 =
        sharding
            .entityRefFor(ShoppingCart.ENTITY_KEY, "concurrent-cart0")
            .askWithStatus(replyTo -> new ShoppingCart.AddItem(item, itemCount, replyTo), timeout);

    TestProbe<Object> probe = testKit.createTestProbe();
    probe.awaitAssert(
        () -> {{
          Optional<ItemPopularity> item1Popularity = itemPopularityRepository.findById(item);
          assertTrue(item1Popularity.isPresent());
          assertEquals(itemCount, item1Popularity.get().getCount());
          return null;
        }});

    // ... when 29 concurrent carts add `item1`...
    for (int i = 1; i < cartCount; i++) {{
      sharding
          .entityRefFor(ShoppingCart.ENTITY_KEY, "concurrent-cart" + i)
          .<ShoppingCart.Summary>askWithStatus(
              replyTo -> new ShoppingCart.AddItem(item, itemCount, replyTo), timeout);
    }}

    // ... then the popularity count is 30
    probe.awaitAssert(
        timeout,
        () -> {{
          Optional<ItemPopularity> item1Popularity = itemPopularityRepository.findById(item);
          assertTrue(item1Popularity.isPresent());
          assertEquals(cartCount * itemCount, item1Popularity.get().getCount());
          return null;
        }});
  }}
```

Conditional Logic Test: Test methods should be simple and execute all statements in the production method. Conditional logic in tests alters behavior and can hide defects. It also reduces test readability.

Example:
```java
@Test
  public void testServiceLoaderForOptions() {{
    for (PipelineOptionsRegistrar registrar :
        Lists.newArrayList(ServiceLoader.load(PipelineOptionsRegistrar.class).iterator())) {{
      if (registrar instanceof SparkStructuredStreamingRunnerRegistrar.Options) {{
        return;
      }}
    }}
    fail("Expected to find " + SparkStructuredStreamingRunnerRegistrar.Options.class);
  }}
```

Sensitive Equality: Occurs when the toString() method is used within a test method to compare objects. If the toString() implementation changes, the test may fail unnecessarily. The correct approach is to implement a dedicated equality-checking method.

Example:
```java
@Test
  public void testWindowedDirectorySinglePattern() {{

  
      ResourceId outputDirectory =
        getBaseTempDirectory()
            .resolve("recommendations/mmmm/", StandardResolveOptions.RESOLVE_DIRECTORY);
    IntervalWindow window = mock(IntervalWindow.class);
    PaneInfo paneInfo = PaneInfo.createPane(false, true, Timing.ON_TIME, 0, 0);

    Instant windowBegin = new DateTime(2017, 1, 8, 10, 55, 0).toInstant();
    Instant windowEnd = new DateTime(2017, 1, 8, 10, 56, 0).toInstant();
    when(window.maxTimestamp()).thenReturn(windowEnd);
    when(window.start()).thenReturn(windowBegin);
    when(window.end()).thenReturn(windowEnd);

    WindowedFilenamePolicy policy =
        WindowedFilenamePolicy.writeWindowedFiles()
            .withOutputDirectory(outputDirectory.toString())
            .withOutputFilenamePrefix("output")
            .withShardTemplate("-SSS-of-NNN")
            .withSuffix("")
            .withMinutePattern("mmmm");

    ResourceId filename =
        policy.windowedFilename(1, 1, window, paneInfo, new TestOutputFileHints());

    assertThat(filename).isNotNull();
    assertThat(filename.getCurrentDirectory().toString()).endsWith("recommendations/0056/");
    assertThat(filename.getFilename()).isEqualTo("output-001-of-001");
  }}
```

Exception Catching Throwing:
Occurs when a test method explicitly uses try/catch blocks or manually throws exceptions to verify error behavior. This practice reduces readability and may hide real errors, since it relies on manual exception handling rather than the test framework’s built-in mechanisms. The correct approach is to use the framework’s native exception assertion methods (e.g., assertThrows in JUnit) to check for expected exceptions clearly and safely.

Example:
```java
@Test
  public void testColumnToValueTimestampInvalid() {{
    TableFieldSchema column =
        new TableFieldSchema().setName(invalidTimestampField).setType("TIMESTAMP");
    Record record =
        generateSingleFieldAvroRecord(
            invalidTimestampField,
            "long",
            invalidTimestampFieldDesc,
            invalidTimestampFieldValueNanos);
    boolean isThrown = false;
    try {{
      Value value = BigQueryConverters.columnToValue(column, record.get(invalidTimestampField));
    }} catch (IllegalArgumentException e) {{
      isThrown = true;
    }}
    assertTrue(isThrown);
  }}
```

You are a senior software engineer. From the definitions above, ANSWER the following question by choosing only ONE alternative, using ONLY the LETTER of the correct option.

Question: In the test code below, which type of "Test Smell" can be identified?

{test_code}

Alternatives:
A: {option_a}
B: {option_b}
C: {option_c}
D: {option_d}
E: None

Answer format: {{A}}

Directive: Provide only one alternative letter and DO NOT include any analysis about the code, only the corresponding letter of the answer.
"""

def create_randomized_prompt(code_snippet: str, correct_smell: str) -> tuple[str | None, str | None]:
    if correct_smell not in TEST_SMELL_TYPES:
        print(
            f"Warning: Test smell '{correct_smell}' not found in the predefined list. Skipping.")
        return None, None
    random.shuffle(TEST_SMELL_TYPES)
    other_smells = [s for s in TEST_SMELL_TYPES if s != correct_smell]
    incorrect_options = random.sample(other_smells, 3)

    options = [correct_smell] + incorrect_options
    random.shuffle(options)

    correct_letter = "ABCD"[options.index(correct_smell)]

    prompt = PROMPT_TEMPLATE.format(
        test_code=code_snippet,
        option_a=options[0],
        option_b=options[1],
        option_c=options[2],
        option_d=options[3]
    )

    return prompt, correct_letter
