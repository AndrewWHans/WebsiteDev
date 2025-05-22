Here's the fixed version with the missing closing brackets:

```javascript
                      type="text"
                      {...register('image_url')}
                      className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  {imagePreview && (
                    <div className="mt-2">
                      <img src={imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-md" />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {editingDeal ? 'Update Deal' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tag Routes Modal */}
      {showTagModal && selectedDeal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium">Tag Routes to Deal</h3>
              <button onClick={() => setShowTagModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loadingRoutes ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {availableRoutes.map((route) => (
                    <div 
                      key={route.id}
                      className="flex items-center p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={taggedRoutes.includes(route.id)}
                        onChange={() => handleToggleRouteTag(route.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <div className="ml-4 flex-1">
                        <div className="flex items-center">
                          <Bus className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="font-medium">{route.pickup.name} → {route.dropoff.name}</span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(route.date).toLocaleDateString()}
                          <MapPin className="w-4 h-4 ml-4 mr-1" />
                          {route.city}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="border-t p-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowTagModal(false)}
                className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTags}
                disabled={savingTags}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {savingTags ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Tags'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```